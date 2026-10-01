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
import { Integration } from './types';

// Only Slack is supported today. Adding a new integration type later is a
// one-line change here - nothing else needs to know the list grew.
export const INTEGRATION_TYPE_OPTIONS: string[] = [t('Slack')];

const INITIAL_INTEGRATIONS: Integration[] = [
  {
    id: 1,
    name: 'Slack notifications',
    type: 'Slack',
    status: 'Active',
    description: 'Posts dashboard alerts to the #data-alerts Slack channel.',
    changed_by_name: 'Alice Kim',
    changed_on_delta_humanized: '2 days ago',
  },
  {
    id: 2,
    name: 'Ops escalation channel',
    type: 'Slack',
    status: 'Active',
    description: 'Sends escalations to the #ops-escalation Slack channel.',
    changed_by_name: 'Marco Diaz',
    changed_on_delta_humanized: '5 days ago',
  },
  {
    id: 3,
    name: 'Finance weekly digest',
    type: 'Slack',
    status: 'Draft',
    description: 'Weekly finance summary posted to #finance-digest.',
    changed_by_name: 'Priya Nair',
    changed_on_delta_humanized: '3 weeks ago',
  },
];

const store = createMockStore<Integration>(INITIAL_INTEGRATIONS);

export interface NewIntegrationInput {
  name: string;
  type: string;
  description: string;
}

export const fetchIntegrations = (): Promise<Integration[]> => store.list();

export const createIntegration = (
  input: NewIntegrationInput,
): Promise<Integration> =>
  store.create({
    ...input,
    status: 'Draft',
    changed_by_name: t('you'),
    changed_on_delta_humanized: t('now'),
  });

export const deleteIntegration = (id: number): Promise<void> =>
  store.remove(id);
