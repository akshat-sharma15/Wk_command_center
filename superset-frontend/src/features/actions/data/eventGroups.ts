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
import { EventGroupOption, EventTypeOption } from './types';

/**
 * Single source of truth for the Group -> Events cascade used by the Create
 * Event form (and resolved for display in the Event listing). There is no
 * backend endpoint for this taxonomy (EventDefinition validates group/type
 * server-side against a fixed vocabulary, but doesn't expose it over the
 * API) - so it stays a static list here, same as before.
 *
 * `id` is deliberately the exact same string the backend validates
 * (EventDefinition::GROUPS_AND_TYPES) rather than a separate slug, so
 * group/eventTypeId round-trip through the real API with no translation
 * layer: what's sent on create/update is exactly what's shown in the list
 * after a refetch. (Previously these were snake_case ids like
 * 'hubs__inbound_truck' with separate, and in several cases mismatched,
 * label text - e.g. 'Fleet' vs the backend's 'Fleet / Transport', 'Shift
 * change' vs 'Shift Change' - which would have made every create/update
 * against those groups fail with a 422.)
 */
export const EVENT_GROUP_OPTIONS: EventGroupOption[] = [
  { id: 'Hubs', label: t('Hubs') },
  { id: 'Fleet / Transport', label: t('Fleet / Transport') },
  { id: 'Workforce', label: t('Workforce') },
  { id: 'Sales', label: t('Sales') },
  { id: 'Finance', label: t('Finance') },
];

export const EVENT_GROUP_EVENTS: Record<string, EventTypeOption[]> = {
  Hubs: [
    { id: 'Inbound Truck', groupId: 'Hubs', label: t('Inbound Truck') },
    { id: 'Outbound Truck', groupId: 'Hubs', label: t('Outbound Truck') },
    { id: 'Parking Space', groupId: 'Hubs', label: t('Parking Space') },
    { id: 'Capacity', groupId: 'Hubs', label: t('Capacity') },
  ],
  'Fleet / Transport': [
    {
      id: 'Failure of Truck with Goods Damaged',
      groupId: 'Fleet / Transport',
      label: t('Failure of Truck with Goods Damaged'),
    },
    {
      id: 'Need Vehicle Replacement',
      groupId: 'Fleet / Transport',
      label: t('Need Vehicle Replacement'),
    },
    {
      id: 'Route Diversion',
      groupId: 'Fleet / Transport',
      label: t('Route Diversion'),
    },
    {
      id: 'Cancel Departure',
      groupId: 'Fleet / Transport',
      label: t('Cancel Departure'),
    },
    {
      id: 'Accident',
      groupId: 'Fleet / Transport',
      label: t('Accident'),
    },
  ],
  Workforce: [
    {
      id: 'Shift Change',
      groupId: 'Workforce',
      label: t('Shift Change'),
    },
    {
      id: 'Low Attendance',
      groupId: 'Workforce',
      label: t('Low Attendance'),
    },
  ],
  Sales: [
    {
      id: 'Low Inbound Calls',
      groupId: 'Sales',
      label: t('Low Inbound Calls'),
    },
    {
      id: 'Low Outbound Calls',
      groupId: 'Sales',
      label: t('Low Outbound Calls'),
    },
  ],
  Finance: [
    {
      id: 'Payment Dues',
      groupId: 'Finance',
      label: t('Payment Dues'),
    },
  ],
};

export function getEventTypeOptions(groupId: string): EventTypeOption[] {
  return EVENT_GROUP_EVENTS[groupId] ?? [];
}

export function findEventGroupOption(
  groupId: string,
): EventGroupOption | undefined {
  return EVENT_GROUP_OPTIONS.find(group => group.id === groupId);
}

export function findEventTypeOption(
  eventTypeId: string,
): EventTypeOption | undefined {
  return Object.values(EVENT_GROUP_EVENTS)
    .flat()
    .find(eventType => eventType.id === eventTypeId);
}
