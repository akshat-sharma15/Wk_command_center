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

// See data/events.ts for why this is needed: the Command Center Rails API
// is a separate backend/origin from Superset itself.
const COMMAND_CENTER_API_HOST = 'localhost:3001';
const CROSS_ORIGIN = { host: COMMAND_CENTER_API_HOST, mode: 'cors' as const };

export interface SlackWorkspace {
  id: string;
  name: string;
}

export interface SlackIntegration {
  id: number;
  type: 'slack';
  status: 'connected' | 'disconnected';
  enabled: boolean;
  workspace: SlackWorkspace;
}

export interface SlackStatus {
  connected: boolean;
  integration?: SlackIntegration;
}

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

export const fetchSlackStatus = async (
  addDangerToast: (message: string) => void,
): Promise<SlackStatus> => {
  try {
    const { json } = await SupersetClient.get({
      ...CROSS_ORIGIN,
      endpoint: '/api/v1/integrations/slack',
    });
    return json as SlackStatus;
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while checking Slack connection'));
    return { connected: false };
  }
};

/**
 * Fetches the Slack authorization URL and returns it - the caller is
 * responsible for the actual browser redirect (`window.location.href =
 * url`), since that's a UI concern, not a data-fetching one.
 */
export const startSlackConnect = async (
  addDangerToast: (message: string) => void,
): Promise<string | null> => {
  try {
    const { json } = await SupersetClient.get({
      ...CROSS_ORIGIN,
      endpoint: '/api/v1/integrations/slack/connect',
    });
    return (json as { authorization_url: string }).authorization_url;
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while connecting to Slack'));
    return null;
  }
};

export const disconnectSlack = async (
  id: number,
  addDangerToast: (message: string) => void,
): Promise<boolean> => {
  try {
    await SupersetClient.delete({
      ...CROSS_ORIGIN,
      endpoint: `/api/v1/integrations/slack/${id}`,
    });
    return true;
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while disconnecting Slack'));
    return false;
  }
};
