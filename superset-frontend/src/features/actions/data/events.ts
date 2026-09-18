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
import { createMockStore } from './mockStore';
import { EventRecord } from './types';

const INITIAL_EVENTS: EventRecord[] = [
  {
    id: 1,
    name: 'Inbound truck arrival',
    description: 'Fires when an inbound truck checks in at any hub.',
    groupId: 'hubs',
    eventTypeId: 'hubs__inbound_truck',
    status: 'Active',
    changed_by_name: 'Marco Diaz',
    changed_on_delta_humanized: '1 day ago',
  },
  {
    id: 2,
    name: 'Hub parking full',
    description: 'Fires when a hub reaches parking capacity.',
    groupId: 'hubs',
    eventTypeId: 'hubs__parking_space',
    status: 'Active',
    changed_by_name: 'Priya Nair',
    changed_on_delta_humanized: '4 days ago',
  },
  {
    id: 3,
    name: 'Truck accident reported',
    description: 'Fires when a driver reports an accident.',
    groupId: 'fleet',
    eventTypeId: 'fleet__accident',
    status: 'Draft',
    changed_by_name: 'Jordan Lee',
    changed_on_delta_humanized: '2 weeks ago',
  },
  {
    id: 4,
    name: 'Low attendance today',
    description: 'Fires when shift attendance drops below threshold.',
    groupId: 'workforce',
    eventTypeId: 'workforce__low_attendance',
    status: 'Inactive',
    changed_by_name: 'Alice Kim',
    changed_on_delta_humanized: '1 month ago',
  },
  {
    id: 5,
    name: 'Payment overdue',
    description: 'Fires when an invoice becomes overdue.',
    groupId: 'finance',
    eventTypeId: 'finance__payment_dues',
    status: 'Active',
    changed_by_name: 'Marco Diaz',
    changed_on_delta_humanized: '6 days ago',
  },
];

const store = createMockStore<EventRecord>(INITIAL_EVENTS);

export interface NewEventInput {
  name: string;
  description: string;
  groupId: string;
  eventTypeId: string;
}

export const fetchEvents = (): Promise<EventRecord[]> => store.list();

export const createEvent = (input: NewEventInput): Promise<EventRecord> =>
  store.create({
    ...input,
    status: 'Draft',
    changed_by_name: t('you'),
    changed_on_delta_humanized: t('now'),
  });

export const deleteEvent = (id: number): Promise<void> => store.remove(id);
