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
"""Builds the dataset-scoped context handed to the Command Center AI service.

The context is assembled server-side from the chart the user asked about, so
the browser never supplies (or can tamper with) the dataset a question is
answered against. Credentials never enter the payload: the AI service is told
*which* dataset to query by name/id, never how to connect to it.
"""

from __future__ import annotations

import logging
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from superset.models.slice import Slice

logger = logging.getLogger(__name__)

# Columns/metrics are capped so a very wide dataset can't blow up the AI
# service's prompt budget. Charts reference far fewer fields than this.
MAX_COLUMNS = 150
MAX_METRICS = 100


def _column_context(datasource: Any) -> list[dict[str, Any]]:
    return [
        {
            "name": column.column_name,
            "type": column.type,
            "verbose_name": column.verbose_name,
            "description": column.description,
            "is_temporal": bool(column.is_dttm),
        }
        for column in (datasource.columns or [])[:MAX_COLUMNS]
    ]


def _metric_context(datasource: Any) -> list[dict[str, Any]]:
    return [
        {
            "name": metric.metric_name,
            "verbose_name": metric.verbose_name,
            "expression": metric.expression,
            "description": metric.description,
        }
        for metric in (datasource.metrics or [])[:MAX_METRICS]
    ]


def _query_scope(form_data: dict[str, Any]) -> dict[str, Any]:
    """The chart's own query configuration: what it measures and how it slices."""
    return {
        "metrics": form_data.get("metrics") or form_data.get("metric"),
        "dimensions": form_data.get("groupby") or form_data.get("all_columns"),
        "filters": form_data.get("adhoc_filters"),
        "time_range": form_data.get("time_range"),
        "time_grain": form_data.get("time_grain_sqla"),
        "row_limit": form_data.get("row_limit"),
        "order_by": form_data.get("order_desc"),
    }


def build_chart_ai_context(chart: "Slice") -> dict[str, Any]:
    """Assemble the AI context for a chart the current user may already read.

    Callers are responsible for having enforced access to both the chart and
    its dataset before calling this.
    """
    datasource = chart.datasource
    try:
        form_data = chart.form_data or {}
    except Exception:  # noqa: BLE001 - malformed params shouldn't kill the chat
        logger.warning("Could not parse form_data for chart %s", chart.id)
        form_data = {}

    context: dict[str, Any] = {
        "chart": {
            "id": chart.id,
            "name": chart.slice_name,
            "viz_type": chart.viz_type,
            "description": chart.description,
            "dashboards": [dashboard.dashboard_title for dashboard in chart.dashboards],
            "query": _query_scope(form_data),
        }
    }

    if datasource is None:
        # A chart whose dataset was deleted still exists; the AI can only talk
        # about the chart's own definition in that case.
        context["dataset"] = None
        return context

    context["dataset"] = {
        "id": datasource.id,
        "name": datasource.table_name,
        "schema": datasource.schema,
        # Identifies the source for the AI service's own query layer. The
        # connection string/credentials are deliberately never included.
        "database_name": datasource.database.database_name,
        "database_backend": datasource.database.backend,
        "columns": _column_context(datasource),
        "metrics": _metric_context(datasource),
    }
    return context
