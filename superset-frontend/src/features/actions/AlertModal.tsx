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
import { useEffect, useMemo, useState, ChangeEvent } from 'react';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import { Input, Modal, Select, Switch } from '@superset-ui/core/components';
import { ModalTitleWithIcon } from 'src/components/ModalTitleWithIcon';
import Role from 'src/types/Role';
import { fetchEvents } from './data/events';
import { fetchRoles } from './data/roles';
import {
  fetchAlertGroups,
  fetchAlertGroupFields,
  fetchAlertGroupFieldOptions,
  fetchAlertRecipientUsers,
  AlertRecipientUser,
  AlertRuleInput,
} from './data/alerts';
import {
  AlertRuleFieldOption,
  AlertRuleGroupOption,
  AlertRuleRecord,
  EventRecord,
} from './data/types';

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'info', label: t('Info') },
  { value: 'warning', label: t('Warning') },
  { value: 'critical', label: t('Critical') },
];

const RECIPIENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'role', label: t('Role') },
  { value: 'user', label: t('User') },
];

const CHANNEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'in_app', label: t('In-App') },
  { value: 'email', label: t('Email') },
  { value: 'slack', label: t('Slack') },
];

interface AlertModalProps {
  addDangerToast: (msg: string) => void;
  show: boolean;
  onHide: () => void;
  onSave: (input: AlertRuleInput) => void;
  /** When set, the modal edits this alert rule instead of creating a new one. */
  alertRule?: AlertRuleRecord | null;
}

const FieldContainer = styled.div(
  ({ theme }) => css`
    margin-bottom: ${theme.sizeUnit * 6}px;

    .control-label {
      margin-bottom: ${theme.sizeUnit * 2}px;
    }

    .required {
      margin-left: ${theme.sizeUnit / 2}px;
      color: ${theme.colorErrorText};
    }
  `,
);

export default function AlertModal({
  addDangerToast,
  show,
  onHide,
  onSave,
  alertRule,
}: AlertModalProps) {
  const isEditMode = Boolean(alertRule);

  const [name, setName] = useState(alertRule?.name ?? '');
  const [groupId, setGroupId] = useState<string | undefined>(alertRule?.group);
  const [field, setField] = useState<string | undefined>(alertRule?.field);
  const [operator, setOperator] = useState<string | undefined>(
    alertRule?.operator,
  );
  const [value, setValue] = useState<string | number | boolean>(
    alertRule?.value ?? '',
  );
  const [severity, setSeverity] = useState<string | undefined>(
    alertRule?.severity,
  );
  const [eventDefinitionId, setEventDefinitionId] = useState<
    number | undefined
  >(alertRule?.event_definition_id ?? undefined);
  const [notify, setNotify] = useState(alertRule?.notify ?? false);
  const [recipientType, setRecipientType] = useState<string | undefined>(
    alertRule?.recipient_type ?? undefined,
  );
  const [recipientId, setRecipientId] = useState<number | undefined>(
    alertRule?.recipient_id ?? undefined,
  );
  const [notificationChannels, setNotificationChannels] = useState<string[]>(
    alertRule?.notification_channels ?? [],
  );

  const [groupOptions, setGroupOptions] = useState<AlertRuleGroupOption[]>([]);
  const [fieldOptions, setFieldOptions] = useState<AlertRuleFieldOption[]>([]);
  const [valueOptions, setValueOptions] = useState<string[] | null>(null);
  const [eventOptions, setEventOptions] = useState<EventRecord[]>([]);
  const [roleOptions, setRoleOptions] = useState<Role[]>([]);
  const [userOptions, setUserOptions] = useState<AlertRecipientUser[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  // The modal is remounted (via a changing `key`) each time it's opened, so
  // it's safe to fetch each dropdown's options once here rather than
  // re-fetching on every keystroke or re-render.
  useEffect(() => {
    Promise.all([
      fetchAlertGroups(addDangerToast),
      fetchEvents(addDangerToast),
      fetchRoles(addDangerToast),
    ])
      .then(([groups, events, roles]) => {
        setGroupOptions(groups);
        setEventOptions(events);
        setRoleOptions(roles);
      })
      .finally(() => setOptionsLoading(false));
  }, [addDangerToast]);

  // Load this group's fields whenever the Group changes (including the
  // initial edit-mode value) - the field select is only ever populated
  // from backend metadata, never a hard-coded frontend list.
  useEffect(() => {
    if (!groupId) {
      setFieldOptions([]);
      return;
    }
    setFieldsLoading(true);
    fetchAlertGroupFields(groupId, addDangerToast)
      .then(setFieldOptions)
      .finally(() => setFieldsLoading(false));
  }, [groupId, addDangerToast]);

  // Load this field's finite option set, if it has one (e.g. an enum-backed
  // status field) - fails soft to null (free-text Value input) otherwise.
  useEffect(() => {
    if (!groupId || !field) {
      setValueOptions(null);
      return;
    }
    fetchAlertGroupFieldOptions(groupId, field).then(setValueOptions);
  }, [groupId, field]);

  // Recipient=User options are only fetched the first time that recipient
  // type is actually selected, since most alerts will use Role.
  useEffect(() => {
    if (recipientType !== 'user' || userOptions.length > 0) return;
    fetchAlertRecipientUsers(addDangerToast).then(setUserOptions);
  }, [recipientType, userOptions.length, addDangerToast]);

  const selectedFieldMeta = useMemo(
    () => fieldOptions.find(option => option.key === field),
    [fieldOptions, field],
  );
  const operatorOptions = selectedFieldMeta?.operators ?? [];

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    // Reset the dependent Field/Operator/Value state whenever Group changes.
    setField(undefined);
    setOperator(undefined);
    setValue('');
  };

  const handleFieldChange = (nextField: string) => {
    setField(nextField);
    // Reset the dependent Operator/Value state whenever Field changes.
    setOperator(undefined);
    setValue('');
  };

  const handleRecipientTypeChange = (nextType: string) => {
    setRecipientType(nextType);
    setRecipientId(undefined);
  };

  const canSave =
    Boolean(name) &&
    Boolean(groupId) &&
    Boolean(field) &&
    Boolean(operator) &&
    value !== '' &&
    Boolean(severity) &&
    (!notify || (Boolean(recipientType) && Boolean(recipientId)));

  const handleSave = () => {
    if (!groupId || !field || !operator || !severity) return;
    onSave({
      name,
      group: groupId,
      field,
      operator,
      value,
      severity,
      eventDefinitionId: eventDefinitionId ?? null,
      notify,
      recipientType: recipientType ?? null,
      recipientId: recipientId ?? null,
      notificationChannels,
      enabled: alertRule?.enabled ?? true,
    });
  };

  const recipientOptions =
    recipientType === 'user'
      ? userOptions.map(user => ({ label: user.name, value: user.id }))
      : roleOptions.map(role => ({ label: role.name, value: role.id }));

  return (
    <Modal
      disablePrimaryButton={!canSave}
      onHandledPrimaryAction={handleSave}
      onHide={onHide}
      primaryButtonName={isEditMode ? t('Save') : t('Create')}
      show={show}
      width="55%"
      title={
        <ModalTitleWithIcon
          isEditMode={isEditMode}
          title={isEditMode ? t('Edit Alert') : t('Create Alert')}
          data-test="alert-modal-title"
        />
      }
    >
      <FieldContainer>
        <div className="control-label">
          {t('Name')}
          <span className="required">*</span>
        </div>
        <Input
          name="name"
          data-test="alert-name-input"
          onChange={handleNameChange}
          type="text"
          value={name}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">
          {t('Group')}
          <span className="required">*</span>
        </div>
        <Select
          ariaLabel={t('Group')}
          loading={optionsLoading}
          options={groupOptions.map(group => ({
            label: group.label,
            value: group.key,
          }))}
          value={groupId}
          onChange={(v: string) => handleGroupChange(v)}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">
          {t('Field')}
          <span className="required">*</span>
        </div>
        <Select
          ariaLabel={t('Field')}
          loading={fieldsLoading}
          disabled={!groupId}
          placeholder={groupId ? undefined : t('Select a Group first')}
          options={fieldOptions.map(option => ({
            label: option.label,
            value: option.key,
          }))}
          value={field}
          onChange={(v: string) => handleFieldChange(v)}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">
          {t('Operator')}
          <span className="required">*</span>
        </div>
        <Select
          ariaLabel={t('Operator')}
          disabled={!field}
          placeholder={field ? undefined : t('Select a Field first')}
          options={operatorOptions.map(op => ({ label: op, value: op }))}
          value={operator}
          onChange={(v: string) => setOperator(v)}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">
          {t('Value')}
          <span className="required">*</span>
        </div>
        {valueOptions ? (
          <Select
            ariaLabel={t('Value')}
            disabled={!field}
            options={valueOptions.map(option => ({
              label: option,
              value: option,
            }))}
            value={typeof value === 'string' ? value || undefined : undefined}
            onChange={(v: string) => setValue(v)}
          />
        ) : (
          <Input
            name="value"
            data-test="alert-value-input"
            disabled={!field}
            type={selectedFieldMeta?.type === 'number' ? 'number' : 'text'}
            value={String(value)}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const raw = event.target.value;
              setValue(
                selectedFieldMeta?.type === 'number' && raw !== ''
                  ? Number(raw)
                  : raw,
              );
            }}
          />
        )}
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">{t('Event')}</div>
        <Select
          ariaLabel={t('Event')}
          loading={optionsLoading}
          allowClear
          placeholder={t('No event (field-only alert)')}
          options={eventOptions.map(event => ({
            label: event.name,
            value: event.id,
          }))}
          value={eventDefinitionId}
          onChange={(v: number | undefined) => setEventDefinitionId(v)}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">
          {t('Severity')}
          <span className="required">*</span>
        </div>
        <Select
          ariaLabel={t('Severity')}
          options={SEVERITY_OPTIONS}
          value={severity}
          onChange={(v: string) => setSeverity(v)}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">{t('Notify')}</div>
        <Switch checked={notify} onChange={setNotify} />
      </FieldContainer>
      {notify && (
        <>
          <FieldContainer>
            <div className="control-label">
              {t('Recipient Type')}
              <span className="required">*</span>
            </div>
            <Select
              ariaLabel={t('Recipient Type')}
              options={RECIPIENT_TYPE_OPTIONS}
              value={recipientType}
              onChange={(v: string) => handleRecipientTypeChange(v)}
            />
          </FieldContainer>
          <FieldContainer>
            <div className="control-label">
              {recipientType === 'user' ? t('User') : t('Role')}
              <span className="required">*</span>
            </div>
            <Select
              ariaLabel={t('Recipient')}
              disabled={!recipientType}
              options={recipientOptions}
              value={recipientId}
              onChange={(v: number) => setRecipientId(v)}
            />
          </FieldContainer>
          <FieldContainer>
            <div className="control-label">{t('Channels')}</div>
            <Select
              ariaLabel={t('Channels')}
              mode="multiple"
              options={CHANNEL_OPTIONS}
              value={notificationChannels}
              onChange={(v: string[]) => setNotificationChannels(v)}
            />
          </FieldContainer>
        </>
      )}
    </Modal>
  );
}
