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
import { AlertRecord, EntityRef } from './types';

const INITIAL_ALERTS: AlertRecord[] = [
  {
    id: 1,
    name: 'Truck accident escalation',
    description: 'Notifies fleet ops when an accident event fires.',
    status: 'Active',
    event: { id: 3, name: 'Truck accident reported' },
    role: { id: 1, name: 'Admin' },
    integration: { id: 1, name: 'Slack notifications' },
    changed_by_name: 'Marco Diaz',
    changed_on_delta_humanized: '3 days ago',
  },
  {
    id: 2,
    name: 'Overdue payment alert',
    description: 'Notifies finance when a payment becomes overdue.',
    status: 'Active',
    event: { id: 5, name: 'Payment overdue' },
    role: { id: 1, name: 'Admin' },
    integration: { id: 3, name: 'Finance weekly digest' },
    changed_by_name: 'Priya Nair',
    changed_on_delta_humanized: '1 week ago',
  },
  {
    id: 3,
    name: 'Hub capacity warning',
    description: 'Notifies hub managers when parking fills up.',
    status: 'Draft',
    event: { id: 2, name: 'Hub parking full' },
    role: { id: 1, name: 'Admin' },
    integration: { id: 2, name: 'Ops escalation channel' },
    changed_by_name: 'Jordan Lee',
    changed_on_delta_humanized: '2 weeks ago',
  },
];

const store = createMockStore<AlertRecord>(INITIAL_ALERTS);

export interface NewAlertInput {
  name: string;
  description: string;
  event: EntityRef;
  role: EntityRef;
  integration: EntityRef;
}

export const fetchAlerts = (): Promise<AlertRecord[]> => store.list();

export const createAlert = (input: NewAlertInput): Promise<AlertRecord> =>
  store.create({
    ...input,
    status: 'Draft',
    changed_by_name: t('you'),
    changed_on_delta_humanized: t('now'),
  });

export const deleteAlert = (id: number): Promise<void> => store.remove(id);
