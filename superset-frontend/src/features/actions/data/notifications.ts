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

export interface NotificationRecord {
  id: number;
  alert_id: number;
  channel: 'in_app' | 'slack';
  status: 'pending' | 'delivered' | 'failed';
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  read: boolean;
  read_at: string | null;
  delivered_at: string | null;
  created_at: string;
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

// The backend identifies "the current user" via this header - see
// SupersetUserIdentifiable on the Rails side for why (Superset's own
// already-authenticated session, read here from Redux state hydrated from
// Superset's bootstrap data - see NotificationBell.tsx).
const identityHeaders = (userId: number) => ({ 'X-Superset-User-Id': String(userId) });

export const fetchNotifications = async (
  userId: number,
  addDangerToast: (message: string) => void,
): Promise<NotificationRecord[]> => {
  try {
    const { json } = await SupersetClient.get({
      ...CROSS_ORIGIN,
      endpoint: '/api/v1/notifications',
      headers: identityHeaders(userId),
    });
    return json as NotificationRecord[];
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while fetching notifications'));
    return [];
  }
};

export const fetchUnreadNotifications = async (
  userId: number,
  addDangerToast: (message: string) => void,
): Promise<NotificationRecord[]> => {
  try {
    const { json } = await SupersetClient.get({
      ...CROSS_ORIGIN,
      endpoint: '/api/v1/notifications/unread',
      headers: identityHeaders(userId),
    });
    return json as NotificationRecord[];
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while fetching notifications'));
    return [];
  }
};

export const fetchNotificationById = async (
  userId: number,
  id: number,
  addDangerToast: (message: string) => void,
): Promise<NotificationRecord | null> => {
  try {
    const { json } = await SupersetClient.get({
      ...CROSS_ORIGIN,
      endpoint: `/api/v1/notifications/${id}`,
      headers: identityHeaders(userId),
    });
    return json as NotificationRecord;
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while fetching notification'));
    return null;
  }
};

export const markNotificationRead = async (
  userId: number,
  id: number,
  addDangerToast: (message: string) => void,
): Promise<NotificationRecord | null> => {
  try {
    // No .patch() on SupersetClientInterface (only get/post/put/delete) -
    // .request() with an explicit method is the documented way to issue
    // any other verb.
    const { json } = await SupersetClient.request({
      ...CROSS_ORIGIN,
      method: 'PATCH',
      endpoint: `/api/v1/notifications/${id}/read`,
      headers: identityHeaders(userId),
    });
    return json as NotificationRecord;
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while marking notification read'));
    return null;
  }
};

/**
 * A short-lived signed ticket for the SSE connection only - EventSource
 * cannot send the X-Superset-User-Id header the other endpoints use, so
 * this exchanges a normal (header-authenticated) request for an opaque,
 * time-limited ticket instead of putting the raw user id in a URL.
 */
export const fetchSseTicket = async (
  userId: number,
  addDangerToast: (message: string) => void,
): Promise<string | null> => {
  try {
    const { json } = await SupersetClient.get({
      ...CROSS_ORIGIN,
      endpoint: '/api/v1/notifications/sse-ticket',
      headers: identityHeaders(userId),
    });
    return (json as { ticket: string }).ticket;
  } catch (response) {
    await reportError(response, addDangerToast, t('Error while connecting to notification stream'));
    return null;
  }
};

export const notificationStreamUrl = (ticket: string): string =>
  `http://${COMMAND_CENTER_API_HOST}/api/v1/notifications/stream?ticket=${encodeURIComponent(ticket)}`;
