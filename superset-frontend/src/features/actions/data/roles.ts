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
import { SupersetClient } from '@superset-ui/core';
import rison from 'rison';
import Role from 'src/types/Role';

/**
 * Unlike Integration/Event/Alert, Roles are not mocked - this project
 * already has a real Roles source (`/api/v1/security/roles/`, the same
 * endpoint `src/pages/UsersList` uses), so the Alert form reuses it
 * directly instead of inventing a parallel role list.
 */
export const fetchRoles = async (
  addDangerToast: (message: string) => void,
): Promise<Role[]> => {
  try {
    const query = rison.encode({ page_size: 100 });
    const { json } = await SupersetClient.get({
      endpoint: `/api/v1/security/roles/?q=${query}`,
    });
    return json.result as Role[];
  } catch {
    addDangerToast(t('Error while fetching roles'));
    return [];
  }
};
