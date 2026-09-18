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
import { useEffect, useState, ChangeEvent } from 'react';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import { Input, Modal, Select } from '@superset-ui/core/components';
import { ModalTitleWithIcon } from 'src/components/ModalTitleWithIcon';
import { fetchEvents } from './data/events';
import { fetchIntegrations } from './data/integrations';
import { fetchRoles } from './data/roles';
import { EntityRef } from './data/types';

interface AlertModalProps {
  addDangerToast: (msg: string) => void;
  show: boolean;
  onHide: () => void;
  onSave: (input: {
    name: string;
    description: string;
    event: EntityRef;
    role: EntityRef;
    integration: EntityRef;
  }) => void;
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
}: AlertModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventOptions, setEventOptions] = useState<EntityRef[]>([]);
  const [integrationOptions, setIntegrationOptions] = useState<EntityRef[]>([]);
  const [roleOptions, setRoleOptions] = useState<EntityRef[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [eventId, setEventId] = useState<number | undefined>(undefined);
  const [roleId, setRoleId] = useState<number | undefined>(undefined);
  const [integrationId, setIntegrationId] = useState<number | undefined>(
    undefined,
  );

  // The modal is remounted (via a changing `key`) each time it's opened, so
  // it's safe to fetch each dropdown's options once here rather than
  // re-fetching on every keystroke or re-render.
  useEffect(() => {
    Promise.all([
      fetchEvents(),
      fetchIntegrations(),
      fetchRoles(addDangerToast),
    ])
      .then(([events, integrations, roles]) => {
        setEventOptions(
          events.map(event => ({ id: event.id, name: event.name })),
        );
        setIntegrationOptions(
          integrations.map(integration => ({
            id: integration.id,
            name: integration.name,
          })),
        );
        setRoleOptions(roles.map(role => ({ id: role.id, name: role.name })));
      })
      .finally(() => setOptionsLoading(false));
  }, [addDangerToast]);

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.target.value);
  };

  const handleSave = () => {
    const event = eventOptions.find(option => option.id === eventId);
    const role = roleOptions.find(option => option.id === roleId);
    const integration = integrationOptions.find(
      option => option.id === integrationId,
    );
    if (!event || !role || !integration) return;
    onSave({ name, description, event, role, integration });
  };

  return (
    <Modal
      disablePrimaryButton={!name || !eventId || !roleId || !integrationId}
      onHandledPrimaryAction={handleSave}
      onHide={onHide}
      primaryButtonName={t('Create')}
      show={show}
      width="55%"
      title={
        <ModalTitleWithIcon
          isEditMode={false}
          title={t('Create Alert')}
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
          {t('Event')}
          <span className="required">*</span>
        </div>
        <Select
          ariaLabel={t('Event')}
          loading={optionsLoading}
          options={eventOptions.map(event => ({
            label: event.name,
            value: event.id,
          }))}
          value={eventId}
          onChange={(value: number) => setEventId(value)}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">
          {t('Role')}
          <span className="required">*</span>
        </div>
        <Select
          ariaLabel={t('Role')}
          loading={optionsLoading}
          options={roleOptions.map(role => ({
            label: role.name,
            value: role.id,
          }))}
          value={roleId}
          onChange={(value: number) => setRoleId(value)}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">
          {t('Integration')}
          <span className="required">*</span>
        </div>
        <Select
          ariaLabel={t('Integration')}
          loading={optionsLoading}
          options={integrationOptions.map(integration => ({
            label: integration.name,
            value: integration.id,
          }))}
          value={integrationId}
          onChange={(value: number) => setIntegrationId(value)}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">{t('Description')}</div>
        <Input.TextArea
          name="description"
          data-test="alert-description-input"
          onChange={handleDescriptionChange}
          rows={4}
          value={description}
        />
      </FieldContainer>
    </Modal>
  );
}
