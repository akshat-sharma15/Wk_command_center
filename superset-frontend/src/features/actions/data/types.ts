/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export type ActionEntityStatus = 'Active' | 'Inactive' | 'Draft';

/** A stable {id, name} reference, mirroring how Superset embeds relations
 * (e.g. a dataset's `database: {id, database_name}`) instead of a bare label. */
export interface EntityRef {
  id: number;
  name: string;
}

export interface Integration {
  id: number;
  name: string;
  type: string;
  status: ActionEntityStatus;
  description: string;
  changed_by_name: string;
  changed_on_delta_humanized: string;
}

export interface EventGroupOption {
  id: string;
  label: string;
}

export interface EventTypeOption {
  id: string;
  groupId: string;
  label: string;
}

/**
 * Backed by the real EventDefinition API (GET/POST/PATCH/DELETE
 * /api/v1/events) as of the alert-system refactor. EventDefinition has no
 * `description`, `status`, or user-attribution columns, so those fields -
 * present in this record's earlier, mock-data shape - were dropped rather
 * than kept as UI-only fields that would silently discard input or show
 * fabricated data. `groupId`/`eventTypeId` are the backend's own
 * `group`/`type` strings (see data/eventGroups.ts), not synthetic slugs.
 */
export interface EventRecord {
  id: number;
  name: string;
  groupId: string;
  eventTypeId: string;
  changed_on_delta_humanized: string;
}

export type AlertRuleOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';

export type AlertRuleSeverity = 'info' | 'warning' | 'critical';

export type AlertRuleRecipientType = 'role' | 'user';

export type AlertRuleNotificationChannel = 'in_app' | 'email' | 'slack';

/** One entry from GET /api/v1/alert-resources - a supported AlertRule group. */
export interface AlertRuleGroupOption {
  key: string;
  label: string;
}

/** One entry from GET /api/v1/alert-resources/:group/fields. */
export interface AlertRuleFieldOption {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  operators: AlertRuleOperator[];
}

/**
 * Backed by the real AlertRule API (GET/POST/PATCH/DELETE
 * /api/v1/alert-rules). Replaces the earlier mock-data AlertRecord shape
 * (description/status/event/role/integration), which had no relationship
 * to the actual AlertRule backend contract at all.
 */
export interface AlertRuleRecord {
  id: number;
  name: string;
  group: string;
  group_label: string;
  field: string;
  field_label: string;
  operator: AlertRuleOperator;
  value: string | number | boolean | null;
  severity: AlertRuleSeverity;
  notify: boolean;
  event_definition_id: number | null;
  event_definition_name: string | null;
  recipient_type: AlertRuleRecipientType | null;
  recipient_id: number | null;
  recipient_name: string | null;
  notification_channels: AlertRuleNotificationChannel[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationPriority = 'Low' | 'Medium' | 'High';

export interface NotificationRecord {
  id: number;
  name: string;
  description: string;
  priority: NotificationPriority;
}
