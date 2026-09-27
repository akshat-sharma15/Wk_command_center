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

/**
 * Chart-scoped chat. Unlike the global assistant in ./aiChat.ts, this goes to
 * Superset's own API rather than straight to the Command Center backend: only
 * a chart id is sent, and Superset resolves the chart, checks the user's
 * access to it and its dataset, and builds the AI context server-side (see
 * superset/chart_chat/api.py). That's why no dataset, SQL, or table name
 * appears in this payload - the browser doesn't get to choose what the
 * assistant can read.
 */
export interface ChartChatResponse {
  answer: string;
  conversation_id: string;
  sources?: string[];
}

const describeError = async (response: unknown): Promise<string> => {
  try {
    const { error, message } = await getClientErrorObject(
      response as Parameters<typeof getClientErrorObject>[0],
    );
    const detail = typeof error === 'string' ? error : undefined;
    return detail || message || t('The assistant could not answer that.');
  } catch {
    return t('The assistant could not answer that.');
  }
};

/**
 * Sends a message about one chart. Omit `message` to open the session, which
 * returns the chart's automatic summary instead of answering a question.
 */
export const sendChartChatMessage = async (
  chartId: number,
  message: string | null,
  conversationId: string | null,
): Promise<ChartChatResponse> => {
  try {
    const { json } = await SupersetClient.post({
      endpoint: '/api/v1/chart_chat/',
      jsonPayload: {
        chart_id: chartId,
        ...(message ? { message } : {}),
        ...(conversationId ? { conversation_id: conversationId } : {}),
      },
    });
    return json as ChartChatResponse;
  } catch (response) {
    // Thrown rather than toasted so the chat panel can render it in-thread,
    // matching ./aiChat.ts.
    throw new Error(await describeError(response));
  }
};
