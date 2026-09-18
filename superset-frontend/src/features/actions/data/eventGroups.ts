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
 * Event form (and resolved for display in the Event listing). Swapping this
 * for an API-backed lookup later only requires changing this file.
 */
export const EVENT_GROUP_OPTIONS: EventGroupOption[] = [
  { id: 'hubs', label: t('Hubs') },
  { id: 'fleet', label: t('Fleet') },
  { id: 'workforce', label: t('Workforce') },
  { id: 'sales', label: t('Sales') },
  { id: 'finance', label: t('Finance') },
];

export const EVENT_GROUP_EVENTS: Record<string, EventTypeOption[]> = {
  hubs: [
    { id: 'hubs__inbound_truck', groupId: 'hubs', label: t('Inbound Truck') },
    { id: 'hubs__outbound_truck', groupId: 'hubs', label: t('Outbound Truck') },
    { id: 'hubs__parking_space', groupId: 'hubs', label: t('Parking Space') },
    { id: 'hubs__capacity', groupId: 'hubs', label: t('Capacity') },
  ],
  fleet: [
    {
      id: 'fleet__truck_damage',
      groupId: 'fleet',
      label: t('Failure of truck with goods damaged'),
    },
    {
      id: 'fleet__vehicle_replacement',
      groupId: 'fleet',
      label: t('Need vehicle replacement'),
    },
    {
      id: 'fleet__route_diversion',
      groupId: 'fleet',
      label: t('Route diversion'),
    },
    {
      id: 'fleet__cancel_departure',
      groupId: 'fleet',
      label: t('Cancel departure'),
    },
    { id: 'fleet__accident', groupId: 'fleet', label: t('Accident') },
  ],
  workforce: [
    {
      id: 'workforce__shift_change',
      groupId: 'workforce',
      label: t('Shift change'),
    },
    {
      id: 'workforce__low_attendance',
      groupId: 'workforce',
      label: t('Low attendance'),
    },
  ],
  sales: [
    {
      id: 'sales__low_inbound_calls',
      groupId: 'sales',
      label: t('Low inbound calls'),
    },
    {
      id: 'sales__low_outbound_calls',
      groupId: 'sales',
      label: t('Low outbound calls'),
    },
  ],
  finance: [
    {
      id: 'finance__payment_dues',
      groupId: 'finance',
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
