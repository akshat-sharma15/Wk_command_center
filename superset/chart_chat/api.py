#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
"""Chart-scoped AI chat.

The browser sends only a chart id. This endpoint resolves the chart, enforces
the current user's access to both the chart and its dataset, builds the AI
context server-side, and forwards it to the Command Center AI service. That
ordering is what keeps the chat scoped: a client cannot name the dataset a
question is answered against, only a chart it is already allowed to read.
"""

from __future__ import annotations

import logging
from typing import Any

import requests
from flask import current_app as app, request, Response
from flask_appbuilder.api import expose, protect, safe
from flask_babel import gettext as _

from superset import security_manager
from superset.chart_chat.context import build_chart_ai_context
from superset.daos.chart import ChartDAO
from superset.exceptions import SupersetSecurityException
from superset.extensions import event_logger
from superset.views.base_api import BaseSupersetApi, statsd_metrics

logger = logging.getLogger(__name__)

AI_SERVICE_TIMEOUT_SECONDS = 60


class ChartChatRestApi(BaseSupersetApi):
    """Ask the Command Center assistant about one specific chart."""

    resource_name = "chart_chat"
    allow_browser_login = True
    # Reuses the Chart permission set: anyone who may read charts may ask
    # about them, and per-chart/per-dataset access is enforced per request.
    class_permission_name = "Chart"
    method_permission_name = {"post": "read"}
    openapi_spec_tag = "Chart Chat"

    @expose("/", methods=("POST",))
    @protect()
    @safe
    @statsd_metrics
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.post",
        log_to_statsd=False,
    )
    def post(self) -> Response:
        """Ask a question about a chart, or open a session to get its summary.
        ---
        post:
          summary: Send a message to the chart-scoped AI assistant
          requestBody:
            required: true
            content:
              application/json:
                schema:
                  type: object
                  required: [chart_id]
                  properties:
                    chart_id:
                      type: integer
                    message:
                      type: string
                      description: >
                        Omit to open the session and receive an automatic
                        summary of the chart instead of answering a question.
                    conversation_id:
                      type: string
          responses:
            200:
              description: The assistant's reply
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      answer:
                        type: string
                      conversation_id:
                        type: string
                      sources:
                        type: array
                        items:
                          type: string
            400:
              $ref: '#/components/responses/400'
            401:
              $ref: '#/components/responses/401'
            403:
              $ref: '#/components/responses/403'
            404:
              $ref: '#/components/responses/404'
            502:
              $ref: '#/components/responses/400'
        """
        payload = request.json or {}

        chart_id = payload.get("chart_id")
        if not isinstance(chart_id, int) or isinstance(chart_id, bool):
            return self.response_400(message=_("chart_id must be an integer"))

        message = payload.get("message")
        if message is not None and not isinstance(message, str):
            return self.response_400(message=_("message must be a string"))
        if isinstance(message, str) and not message.strip():
            return self.response_400(message=_("message cannot be empty"))

        conversation_id = payload.get("conversation_id")
        if conversation_id is not None and not isinstance(conversation_id, str):
            return self.response_400(message=_("conversation_id must be a string"))

        chart = ChartDAO.find_by_id(chart_id)
        if not chart:
            return self.response_404()

        try:
            # Guards the chart itself, then the dataset behind it. The second
            # check is explicit rather than implied: the whole point of this
            # endpoint is that the dataset is never client-supplied, so the
            # dataset's own access rules have to hold for this user too.
            security_manager.raise_for_access(chart=chart)
            if chart.datasource is not None:
                security_manager.raise_for_access(datasource=chart.datasource)
        except SupersetSecurityException:
            logger.info(
                "Denied chart-chat access to chart %s for user %s",
                chart_id,
                security_manager.current_user,
            )
            return self.response_403()

        context = build_chart_ai_context(chart)

        try:
            result = self._ask_ai_service(context, message, conversation_id)
        except ChartChatServiceError as ex:
            return self.response(502, message=str(ex))

        return self.response(200, **result)

    def _ask_ai_service(
        self,
        context: dict[str, Any],
        message: str | None,
        conversation_id: str | None,
    ) -> dict[str, Any]:
        """Forward the resolved context to the AI service, server-to-server."""
        base_url = app.config.get("COMMAND_CENTER_API_URL")
        if not base_url:
            raise ChartChatServiceError(
                _("The AI assistant is not configured on this server.")
            )

        headers = {"Content-Type": "application/json"}
        # Proves to the AI service that this context was assembled by Superset
        # after a permission check, rather than posted by a browser directly.
        service_token = app.config.get("COMMAND_CENTER_SERVICE_TOKEN")
        if service_token:
            headers["X-Command-Center-Service-Token"] = service_token

        body: dict[str, Any] = {"context": context}
        if message is not None:
            body["message"] = message
        if conversation_id:
            body["conversation_id"] = conversation_id

        try:
            response = requests.post(
                f"{base_url.rstrip('/')}/api/v1/ai/chart_chat",
                json=body,
                headers=headers,
                timeout=AI_SERVICE_TIMEOUT_SECONDS,
            )
        except requests.exceptions.Timeout as ex:
            logger.warning("Chart chat AI service timed out: %s", ex)
            raise ChartChatServiceError(
                _("The AI assistant took too long to respond. Please try again.")
            ) from ex
        except requests.exceptions.RequestException as ex:
            logger.warning("Chart chat AI service unreachable: %s", ex)
            raise ChartChatServiceError(
                _("Could not reach the AI assistant. Please try again.")
            ) from ex

        if not response.ok:
            # The upstream body may carry internal detail, so it is logged
            # rather than returned to the browser.
            logger.warning(
                "Chart chat AI service returned %s: %s",
                response.status_code,
                response.text[:500],
            )
            raise ChartChatServiceError(
                _("The AI assistant could not answer that right now.")
            )

        try:
            return response.json()
        except ValueError as ex:
            logger.warning("Chart chat AI service returned a non-JSON body")
            raise ChartChatServiceError(
                _("The AI assistant returned an unexpected response.")
            ) from ex


class ChartChatServiceError(Exception):
    """The AI service could not be reached or could not answer."""
