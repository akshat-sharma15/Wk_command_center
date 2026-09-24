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

export interface AiChatResponse {
  answer: string;
  conversation_id: string;
  sources: string[];
}

const describeError = (error: unknown): string =>
  Array.isArray(error) ? error.join(', ') : String(error);

/**
 * Unlike the other data/*.ts helpers, this throws (with a user-facing
 * message) instead of swallowing the error and returning a default -
 * AiChatWidget needs to know a send failed so it can render an error
 * bubble in the conversation thread rather than silently going quiet.
 */
async function chatErrorMessage(
  response: unknown,
  fallback: string,
): Promise<string> {
  try {
    const { error } = await getClientErrorObject(
      response as Parameters<typeof getClientErrorObject>[0],
    );
    const detail = (error as { error?: unknown })?.error;
    return detail ? describeError(detail) : fallback;
  } catch {
    return fallback;
  }
}

export const sendAiChatMessage = async (
  message: string,
  conversationId: string | null,
): Promise<AiChatResponse> => {
  try {
    const { json } = await SupersetClient.post({
      ...CROSS_ORIGIN,
      endpoint: '/api/v1/ai/chat',
      jsonPayload: {
        message,
        ...(conversationId ? { conversation_id: conversationId } : {}),
      },
    });
    return json as AiChatResponse;
  } catch (response) {
    throw new Error(
      await chatErrorMessage(
        response,
        t("The Command Centre AI assistant couldn't reach the server. Please try again."),
      ),
    );
  }
};
