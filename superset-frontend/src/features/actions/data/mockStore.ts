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

/**
 * A tiny in-memory "backend" for an entity list, exposing the same async
 * list/create/delete shape a real REST-backed service would. Each
 * data/*.ts file wraps one of these around its mock array so that swapping
 * the mock store for real `SupersetClient` calls later is a change confined
 * to that one file - UI components only ever call the returned functions.
 */
export function createMockStore<T extends { id: number }>(seed: T[]) {
  let items = [...seed];

  const nextId = () =>
    items.reduce((max, item) => Math.max(max, item.id), 0) + 1;

  return {
    list: async (): Promise<T[]> => items,
    create: async (item: Omit<T, 'id'>): Promise<T> => {
      const created = { ...item, id: nextId() } as T;
      items = [created, ...items];
      return created;
    },
    remove: async (id: number): Promise<void> => {
      items = items.filter(item => item.id !== id);
    },
  };
}
