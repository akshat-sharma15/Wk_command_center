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
from unittest.mock import MagicMock, PropertyMock

from superset.chart_chat.context import build_chart_ai_context
from superset.utils import json


def make_column(name, col_type="VARCHAR", is_dttm=False, description=None):
    column = MagicMock()
    column.column_name = name
    column.type = col_type
    column.verbose_name = None
    column.description = description
    column.is_dttm = is_dttm
    return column


def make_metric(name, expression="COUNT(*)"):
    metric = MagicMock()
    metric.metric_name = name
    metric.verbose_name = None
    metric.expression = expression
    metric.description = None
    return metric


def make_chart(form_data=None, datasource=True):
    chart = MagicMock()
    chart.id = 42
    chart.slice_name = "Total Vehicles"
    chart.viz_type = "big_number_total"
    chart.description = "Fleet size"
    dashboard = MagicMock()
    dashboard.dashboard_title = "Fleet / Vehicles / Routes"
    chart.dashboards = [dashboard]
    type(chart).form_data = PropertyMock(return_value=form_data or {})

    if not datasource:
        chart.datasource = None
        return chart

    table = MagicMock()
    table.id = 7
    table.table_name = "vw_fleet_dashboard_summary"
    table.schema = "public"
    table.columns = [make_column("hub_name"), make_column("ts", "TIMESTAMP", True)]
    table.metrics = [make_metric("count")]
    table.database.database_name = "wkcc_ops"
    table.database.backend = "postgresql"
    # Whatever a Database exposes about connecting to itself must not end up
    # in the context; present here so the assertions below are meaningful.
    table.database.sqlalchemy_uri = "postgresql://user:sup3rsecret@host/db"
    table.database.password = "sup3rsecret"  # noqa: S105
    chart.datasource = table
    return chart


def test_context_describes_the_chart_and_its_dataset():
    context = build_chart_ai_context(make_chart())

    assert context["chart"]["id"] == 42
    assert context["chart"]["name"] == "Total Vehicles"
    assert context["chart"]["viz_type"] == "big_number_total"
    assert context["chart"]["dashboards"] == ["Fleet / Vehicles / Routes"]
    assert context["dataset"]["name"] == "vw_fleet_dashboard_summary"
    assert context["dataset"]["id"] == 7
    assert [column["name"] for column in context["dataset"]["columns"]] == [
        "hub_name",
        "ts",
    ]
    assert context["dataset"]["columns"][1]["is_temporal"] is True
    assert [metric["name"] for metric in context["dataset"]["metrics"]] == ["count"]


def test_context_never_carries_connection_credentials():
    """The AI service is told which dataset to read, never how to connect."""
    serialized = json.dumps(build_chart_ai_context(make_chart()))

    assert "sup3rsecret" not in serialized
    assert "sqlalchemy_uri" not in serialized
    assert "postgresql://" not in serialized


def test_context_carries_the_charts_own_query_scope():
    context = build_chart_ai_context(
        make_chart(
            form_data={
                "metrics": ["count"],
                "groupby": ["hub_name"],
                "time_range": "Last week",
                "time_grain_sqla": "P1D",
                "row_limit": 100,
                "adhoc_filters": [
                    {
                        "expressionType": "SIMPLE",
                        "subject": "status",
                        "operator": "==",
                        "comparator": "active",
                    }
                ],
            }
        )
    )

    query = context["chart"]["query"]
    assert query["metrics"] == ["count"]
    assert query["dimensions"] == ["hub_name"]
    assert query["time_range"] == "Last week"
    assert query["time_grain"] == "P1D"
    assert query["filters"][0]["subject"] == "status"


def test_chart_whose_dataset_was_deleted_still_yields_context():
    context = build_chart_ai_context(make_chart(datasource=False))

    assert context["dataset"] is None
    assert context["chart"]["name"] == "Total Vehicles"


def test_unparseable_form_data_does_not_break_the_context():
    chart = make_chart()
    type(chart).form_data = PropertyMock(side_effect=ValueError("bad json"))

    context = build_chart_ai_context(chart)

    assert context["chart"]["query"]["metrics"] is None
    assert context["dataset"]["name"] == "vw_fleet_dashboard_summary"
