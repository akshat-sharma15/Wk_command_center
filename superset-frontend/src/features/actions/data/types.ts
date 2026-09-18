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

export type ActionEntityStatus = 'Active' | 'Inactive' | 'Draft';

/** A stable {id, name} reference, mirroring how Superset embeds relations
 * (e.g. a dataset's `database: {id, database_name}`) instead of a bare label. */
export interface EntityRef {
  id: number;
  name: string;
}

export interface Integration {
  id: number;
  name: string;
  type: string;
  status: ActionEntityStatus;
  description: string;
  changed_by_name: string;
  changed_on_delta_humanized: string;
}

export interface EventGroupOption {
  id: string;
  label: string;
}

export interface EventTypeOption {
  id: string;
  groupId: string;
  label: string;
}

export interface EventRecord {
  id: number;
  name: string;
  description: string;
  groupId: string;
  eventTypeId: string;
  status: ActionEntityStatus;
  changed_by_name: string;
  changed_on_delta_humanized: string;
}

export interface AlertRecord {
  id: number;
  name: string;
  description: string;
  status: ActionEntityStatus;
  event: EntityRef;
  role: EntityRef;
  integration: EntityRef;
  changed_by_name: string;
  changed_on_delta_humanized: string;
}

export type NotificationPriority = 'Low' | 'Medium' | 'High';

export interface NotificationRecord {
  id: number;
  name: string;
  description: string;
  priority: NotificationPriority;
}
