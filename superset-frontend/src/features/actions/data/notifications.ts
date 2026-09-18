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
import { NotificationRecord } from './types';

const NOTIFICATIONS: NotificationRecord[] = [
  {
    id: 1,
    name: 'Truck accident escalation triggered',
    description:
      'The "Truck accident escalation" alert fired for hub HUB-014 after a driver reported an accident. Fleet ops has been notified via Slack.',
    priority: 'High',
  },
  {
    id: 2,
    name: 'Overdue payment alert triggered',
    description:
      'Invoice INV-2291 is 12 days overdue. The "Overdue payment alert" notified finance via the weekly digest channel.',
    priority: 'Medium',
  },
  {
    id: 3,
    name: 'Hub capacity warning triggered',
    description:
      'Hub HUB-002 reached 95% parking capacity. The "Hub capacity warning" alert notified hub managers.',
    priority: 'Low',
  },
];

export const fetchNotifications = async (): Promise<NotificationRecord[]> =>
  NOTIFICATIONS;

export const fetchNotificationById = async (
  id: number,
): Promise<NotificationRecord | undefined> =>
  NOTIFICATIONS.find(notification => notification.id === id);

export const fetchNotificationCount = async (): Promise<number> =>
  NOTIFICATIONS.length;
