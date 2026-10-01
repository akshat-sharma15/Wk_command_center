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
import { useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import {
  Button,
  EmptyState,
  Input,
  Loading,
  Select,
  Tag,
} from '@superset-ui/core/components';
import { Descriptions } from 'src/components/Descriptions';
import { addDangerToast } from 'src/components/MessageToasts/actions';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import { AlertRecipientUser, fetchAlertRecipientUsers } from './data/alerts';
import {
  fetchIncidentAlert,
  fetchIncidentWaybills,
  INCIDENT_UPDATE_EVENT,
  IncidentAction,
  IncidentAlert,
  IncidentWaybill,
  runIncidentAction,
} from './data/incidents';

const Section = styled.div`
  ${({ theme }) => css`
    margin: 0 ${theme.sizeUnit * 3}px ${theme.sizeUnit * 6}px;
    background-color: ${theme.colorBgContainer};
  `}
`;

const ActionBar = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${theme.sizeUnit * 2}px;
    margin: 0 ${theme.sizeUnit * 3}px ${theme.sizeUnit * 4}px;
  `}
`;

const AssigneeSelect = styled.div`
  min-width: 260px;
`;

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'error',
  warning: 'warning',
  info: 'processing',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'error',
  acknowledged: 'warning',
  in_progress: 'processing',
  escalated: 'magenta',
  resolved: 'success',
};

const formatDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString() : '—';

const statusLabel = (status: string) => status.replace('_', ' ').toUpperCase();

interface IncidentPanelProps {
  alertId: number;
  /** Pre-open a section/action (from Slack/notification links). */
  initialSection?: string | null;
  initialAction?: string | null;
}

/**
 * Incident detail + actions for one Command Center alert. Renders the
 * shared incident card (the same rows/links/actions Slack shows) and runs
 * acknowledge / assign / reassign / escalate / resolve against the same
 * Alert record. Refreshes when NotificationBell relays an SSE
 * incident_update for this alert.
 */
export default function IncidentPanel({
  alertId,
  initialSection = null,
  initialAction = null,
}: IncidentPanelProps) {
  const dispatch = useDispatch();
  const user = useSelector<any, UserWithPermissionsAndRoles>(
    state => state.user,
  );
  const toast = useCallback(
    (message: string) => dispatch(addDangerToast(message)),
    [dispatch],
  );
  const [alert, setAlert] = useState<IncidentAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [note, setNote] = useState('');
  const [users, setUsers] = useState<AlertRecipientUser[]>([]);
  const [assigneeId, setAssigneeId] = useState<number | undefined>();
  const [waybills, setWaybills] = useState<IncidentWaybill[] | null>(null);
  const [showWaybills, setShowWaybills] = useState(
    initialSection === 'waybills',
  );

  const load = useCallback(
    () =>
      fetchIncidentAlert(alertId, toast).then(result => {
        setAlert(result);
        setLoading(false);
      }),
    [alertId, toast],
  );

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    fetchAlertRecipientUsers(toast).then(setUsers);
  }, [toast]);

  // Live status from other users/Slack-initiated changes (existing SSE).
  useEffect(() => {
    const onUpdate = (event: Event) => {
      const { detail } = event as CustomEvent<{ alert_id: number }>;
      if (detail?.alert_id === alertId) load();
    };
    window.addEventListener(INCIDENT_UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(INCIDENT_UPDATE_EVENT, onUpdate);
  }, [alertId, load]);

  const tripId = alert?.incident?.trip_id;
  useEffect(() => {
    if (!showWaybills || !tripId || waybills) return;
    fetchIncidentWaybills(tripId, toast).then(setWaybills);
  }, [showWaybills, tripId, waybills, toast]);

  const run = async (
    action: IncidentAction,
    body: Record<string, unknown> = {},
  ) => {
    if (!user?.userId) return;
    setActing(true);
    const updated = await runIncidentAction(
      user.userId,
      alertId,
      action,
      toast,
      body,
    );
    setActing(false);
    if (updated) setAlert(updated);
  };

  if (loading) return <Loading />;
  if (!alert) {
    return <EmptyState title={t('Incident not found')} image="empty.svg" />;
  }

  const { card } = alert;
  const allowed = new Set(card?.actions ?? []);
  const resolved = alert.status === 'resolved';
  const canAssign = allowed.has('assign') || allowed.has('reassign');
  const links = card?.links ?? {};

  return (
    <>
      <Section>
        <Descriptions
          bordered
          size="small"
          column={1}
          labelStyle={{ width: '180px' }}
          title={
            <>
              {card?.incident_title ?? alert.rule_name}{' '}
              <Tag color={SEVERITY_COLORS[alert.severity]}>
                {alert.severity}
              </Tag>
              <Tag color={STATUS_COLORS[alert.status]}>
                {statusLabel(alert.status)}
              </Tag>
              <Tag>{t('Alert #%s', alert.id)}</Tag>
            </>
          }
        >
          {card?.summary && (
            <Descriptions.Item label={t('Summary')}>
              {card.summary}
            </Descriptions.Item>
          )}
          <Descriptions.Item label={t('Triggered')}>
            {formatDateTime(alert.triggered_at)}
          </Descriptions.Item>
          {(card?.fields ?? []).map(field => (
            <Descriptions.Item key={field.label} label={field.label}>
              {field.label === 'Waybills' && tripId ? (
                <Button
                  buttonStyle="link"
                  onClick={() => setShowWaybills(true)}
                >
                  {field.value}
                </Button>
              ) : (
                field.value
              )}
            </Descriptions.Item>
          ))}
          {alert.resolution_note && (
            <Descriptions.Item label={t('Resolution')}>
              {alert.resolution_note}
            </Descriptions.Item>
          )}
          {alert.history.length > 0 && (
            <Descriptions.Item label={t('History')}>
              {alert.history.map(entry => (
                <div key={`${entry.action}-${entry.at}`}>
                  {`${formatDateTime(entry.at)} · ${entry.action}`}
                  {entry.to_name ? ` → ${entry.to_name}` : ''}
                  {entry.actor_name ? ` (${t('by')} ${entry.actor_name})` : ''}
                  {entry.note ? ` — ${entry.note}` : ''}
                </div>
              ))}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Section>
      <ActionBar>
        {(
          [
            ['vehicle', t('View Truck')],
            ['route', t('View Route')],
            ['hub', t('View Hub')],
          ] as const
        ).map(
          ([key, label]) =>
            links[key] && (
              <Button
                key={key}
                buttonStyle="secondary"
                href={links[key]}
                target="_blank"
              >
                {label}
              </Button>
            ),
        )}
        {tripId && (
          <Button
            buttonStyle="secondary"
            onClick={() => setShowWaybills(visible => !visible)}
          >
            {t('View Waybills')}
          </Button>
        )}
        <Button
          buttonStyle={
            initialAction === 'acknowledge' ? 'primary' : 'secondary'
          }
          disabled={acting || !allowed.has('acknowledge')}
          onClick={() => run('acknowledge')}
        >
          {t('Acknowledge')}
        </Button>
        <Button
          buttonStyle="secondary"
          disabled={acting || !allowed.has('escalate')}
          onClick={() => run('escalate')}
        >
          {t('Escalate')}
        </Button>
      </ActionBar>
      {!resolved && canAssign && (
        <ActionBar>
          <AssigneeSelect>
            <Select
              ariaLabel={t('Assign to')}
              placeholder={t('Assign to…')}
              options={users.map(candidate => ({
                label: candidate.name,
                value: candidate.id,
              }))}
              value={assigneeId}
              onChange={(value: number) => setAssigneeId(value)}
            />
          </AssigneeSelect>
          <Button
            buttonStyle={
              initialAction === 'assign' || initialAction === 'reassign'
                ? 'primary'
                : 'secondary'
            }
            disabled={acting || !assigneeId}
            onClick={() =>
              run(allowed.has('reassign') ? 'reassign' : 'assign', {
                assignee_type: 'user',
                assignee_id: assigneeId,
              })
            }
          >
            {allowed.has('reassign') ? t('Reassign') : t('Assign')}
          </Button>
        </ActionBar>
      )}
      {!resolved && (
        <ActionBar>
          <Input.TextArea
            aria-label={t('Resolution note')}
            placeholder={t(
              'Resolution note, e.g. Replacement truck assigned and shipment transferred.',
            )}
            value={note}
            onChange={event => setNote(event.target.value)}
            rows={2}
            autoFocus={initialAction === 'resolve'}
          />
          <Button
            buttonStyle="danger"
            disabled={acting}
            onClick={() => run('resolve', { resolution_note: note })}
          >
            {t('Resolve')}
          </Button>
        </ActionBar>
      )}
      {showWaybills && (
        <Section>
          <Descriptions
            bordered
            size="small"
            column={1}
            labelStyle={{ width: '180px' }}
            title={t('Affected waybills')}
          >
            {!waybills && (
              <Descriptions.Item label={t('Loading')}>…</Descriptions.Item>
            )}
            {waybills?.map(waybill => (
              <Descriptions.Item
                key={waybill.id}
                label={waybill.waybill_number}
              >
                {[
                  waybill.customer ?? t('%s customers', waybill.customer_count),
                  t('%s packages', waybill.total_packages),
                  t('%s orders', waybill.total_orders),
                  waybill.destination?.name,
                  `${t('ETA')} ${formatDateTime(waybill.expected_arrival_at)}`,
                  waybill.status,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Section>
      )}
    </>
  );
}
