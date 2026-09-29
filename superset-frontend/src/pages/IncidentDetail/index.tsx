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
import { useLocation, useParams } from 'react-router-dom';
import { t } from '@apache-superset/core/translation';
import SubMenu from 'src/features/home/SubMenu';
import IncidentPanel from 'src/features/actions/IncidentPanel';

/**
 * /incident/:alertId - the drill-through target for incident
 * notifications and Slack incident buttons (?section=waybills,
 * ?action=acknowledge|assign|reassign|resolve pre-open that part).
 */
export default function IncidentDetail() {
  const { alertId } = useParams<{ alertId: string }>();
  const query = new URLSearchParams(useLocation().search);
  return (
    <>
      <SubMenu name={t('Incident')} />
      <IncidentPanel
        alertId={Number(alertId)}
        initialSection={query.get('section')}
        initialAction={query.get('action')}
      />
    </>
  );
}
