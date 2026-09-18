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
"""
Backend routes for the "Action" tab's Integration/Event/Alert screens and
the notification detail page.

These views only serve the SPA shell (matching the pattern used by other
frontend-route-only pages, e.g. RowLevelSecurityView) so that a direct or
reloaded browser navigation to one of these URLs works, not just an
in-app client-side transition. The screens themselves are still
frontend-only and use static/mock data.
"""
from flask_appbuilder import expose
from flask_appbuilder.security.decorators import has_access, permission_name

from superset.superset_typing import FlaskResponse
from superset.views.base import BaseSupersetView


class IntegrationListView(BaseSupersetView):
    route_base = "/integration"
    class_permission_name = "Action"

    @expose("/list/")
    @has_access
    @permission_name("read")
    def list(self) -> FlaskResponse:
        return super().render_app_template()


class EventListView(BaseSupersetView):
    route_base = "/event"
    class_permission_name = "Action"

    @expose("/list/")
    @has_access
    @permission_name("read")
    def list(self) -> FlaskResponse:
        return super().render_app_template()


class ActionAlertListView(BaseSupersetView):
    route_base = "/action-alert"
    class_permission_name = "Action"

    @expose("/list/")
    @has_access
    @permission_name("read")
    def list(self) -> FlaskResponse:
        return super().render_app_template()


class NotificationDetailView(BaseSupersetView):
    route_base = "/notification"
    class_permission_name = "Action"

    @expose("/<notification_id>")
    @has_access
    @permission_name("read")
    # pylint: disable=unused-argument
    def show(self, notification_id: str) -> FlaskResponse:
        return super().render_app_template()
