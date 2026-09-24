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
import { t } from '@apache-superset/core/translation';
import { SupersetClient, getClientErrorObject } from '@superset-ui/core';
import {
  AlertRuleRecord,
  AlertRuleGroupOption,
  AlertRuleFieldOption,
  AlertRuleTriggerType,
} from './types';

// See data/events.ts for why this is needed: the Command Center Rails API
// is a separate backend/origin from Superset itself.
const COMMAND_CENTER_API_HOST = 'localhost:3001';
const CROSS_ORIGIN = { host: COMMAND_CENTER_API_HOST, mode: 'cors' as const };

const describeError = (error: unknown): string =>
  Array.isArray(error) ? error.join(', ') : String(error);

async function reportError(
  response: unknown,
  addDangerToast: (message: string) => void,
  fallback: string,
) {
  try {
    const { error } = await getClientErrorObject(
      response as Parameters<typeof getClientErrorObject>[0],
    );
    const detail = (error as { error?: unknown })?.error;
    addDangerToast(detail ? describeError(detail) : fallback);
  } catch {
    addDangerToast(fallback);
  }
}

// --- AlertRule CRUD --------------------------------------------------

export const fetchAlertRules = async (
  addDangerToast: (message: string) => void,
): Promise<AlertRuleRecord[]> => {
  try {
    const { json } = await SupersetClient.get({
      ...CROSS_ORIGIN,
      endpoint: '/api/v1/alert-rules',
    });
    return json as AlertRuleRecord[];
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while fetching alerts'));
    return [];
  }
};

export interface AlertRuleInput {
  name: string;
  triggerType: AlertRuleTriggerType;
  group: string | null;
  field: string | null;
  operator: string | null;
  value: string | number | boolean | null;
  severity: string;
  eventDefinitionId: number | null;
  notify: boolean;
  recipientType: string | null;
  recipientId: number | null;
  notificationChannels: string[];
  enabled: boolean;
}

// The two trigger modes are mutually exclusive on the backend (see
// AlertRule#event_trigger?/#condition_trigger?) - null out whichever
// mode's fields don't apply rather than relying on the caller to have
// done so, so a stray leftover value can never flip a request from one
// mode to a rejected mixed one.
const toAlertRulePayload = (input: AlertRuleInput) => ({
  alert_rule: {
    name: input.name,
    trigger_type: input.triggerType,
    group: input.triggerType === 'condition' ? input.group : null,
    field: input.triggerType === 'condition' ? input.field : null,
    operator: input.triggerType === 'condition' ? input.operator : null,
    value: input.triggerType === 'condition' ? input.value : null,
    severity: input.severity,
    event_definition_id:
      input.triggerType === 'event' ? input.eventDefinitionId : null,
    notify: input.notify,
    recipient_type: input.notify ? input.recipientType : null,
    recipient_id: input.notify ? input.recipientId : null,
    notification_channels: input.notify ? input.notificationChannels : [],
    enabled: input.enabled,
  },
});

export const createAlertRule = async (
  input: AlertRuleInput,
  addDangerToast: (message: string) => void,
): Promise<AlertRuleRecord | null> => {
  try {
    const { json } = await SupersetClient.post({
      ...CROSS_ORIGIN,
      endpoint: '/api/v1/alert-rules',
      jsonPayload: toAlertRulePayload(input),
    });
    return json as AlertRuleRecord;
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while creating alert'));
    return null;
  }
};

export const updateAlertRule = async (
  id: number,
  input: AlertRuleInput,
  addDangerToast: (message: string) => void,
): Promise<AlertRuleRecord | null> => {
  try {
    const { json } = await SupersetClient.put({
      ...CROSS_ORIGIN,
      endpoint: `/api/v1/alert-rules/${id}`,
      jsonPayload: toAlertRulePayload(input),
    });
    return json as AlertRuleRecord;
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while updating alert'));
    return null;
  }
};

export const deleteAlertRule = async (
  id: number,
  addDangerToast: (message: string) => void,
): Promise<boolean> => {
  try {
    await SupersetClient.delete({
      ...CROSS_ORIGIN,
      endpoint: `/api/v1/alert-rules/${id}`,
    });
    return true;
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while deleting alert'));
    return false;
  }
};

// --- Alert Builder metadata (group -> field -> operator/options) -----

export const fetchAlertGroups = async (
  addDangerToast: (message: string) => void,
): Promise<AlertRuleGroupOption[]> => {
  try {
    const { json } = await SupersetClient.get({
      ...CROSS_ORIGIN,
      endpoint: '/api/v1/alert-resources',
    });
    return json as AlertRuleGroupOption[];
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while fetching alert groups'));
    return [];
  }
};

export const fetchAlertGroupFields = async (
  group: string,
  addDangerToast: (message: string) => void,
): Promise<AlertRuleFieldOption[]> => {
  try {
    const { json } = await SupersetClient.get({
      ...CROSS_ORIGIN,
      endpoint: `/api/v1/alert-resources/${encodeURIComponent(group)}/fields`,
    });
    return json as AlertRuleFieldOption[];
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while fetching fields'));
    return [];
  }
};

/**
 * Returns null (deliberately, no toast) when the field has no finite
 * option set - the backend returns 422 for most fields (e.g. numeric
 * ones), which is an expected, common response here, not an error to
 * surface to the user.
 */
export const fetchAlertGroupFieldOptions = async (
  group: string,
  field: string,
): Promise<string[] | null> => {
  try {
    const { json } = await SupersetClient.get({
      ...CROSS_ORIGIN,
      endpoint: `/api/v1/alert-resources/${encodeURIComponent(group)}/fields/${encodeURIComponent(field)}/options`,
    });
    return json as string[];
  } catch {
    return null;
  }
};

// --- Recipients --------------------------------------------------------
// Roles intentionally are NOT fetched here - see data/roles.ts, which
// keeps using Superset's own existing `/api/v1/security/roles/` API, per
// explicit instruction not to duplicate that integration.

export interface AlertRecipientUser {
  id: number;
  name: string;
  username: string;
  email: string;
}

export const fetchAlertRecipientUsers = async (
  addDangerToast: (message: string) => void,
): Promise<AlertRecipientUser[]> => {
  try {
    const { json } = await SupersetClient.get({
      ...CROSS_ORIGIN,
      endpoint: '/api/v1/alert-recipients/users',
    });
    return json as AlertRecipientUser[];
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while fetching users'));
    return [];
  }
};
