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
import { useMemo, useState, ChangeEvent } from 'react';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import { Input, Modal, Select } from '@superset-ui/core/components';
import { ModalTitleWithIcon } from 'src/components/ModalTitleWithIcon';
import { EVENT_GROUP_OPTIONS, getEventTypeOptions } from './data/eventGroups';

interface EventModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (input: {
    name: string;
    description: string;
    groupId: string;
    eventTypeId: string;
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

export default function EventModal({ show, onHide, onSave }: EventModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState<string | undefined>(undefined);
  const [eventTypeId, setEventTypeId] = useState<string | undefined>(undefined);

  const eventTypeOptions = useMemo(
    () => (groupId ? getEventTypeOptions(groupId) : []),
    [groupId],
  );

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.target.value);
  };

  const handleGroupChange = (value: string) => {
    setGroupId(value);
    // Clear the previously selected Event whenever the Group changes.
    setEventTypeId(undefined);
  };

  const handleSave = () => {
    if (!groupId || !eventTypeId) return;
    onSave({ name, description, groupId, eventTypeId });
  };

  return (
    <Modal
      disablePrimaryButton={!name || !groupId || !eventTypeId}
      onHandledPrimaryAction={handleSave}
      onHide={onHide}
      primaryButtonName={t('Create')}
      show={show}
      width="55%"
      title={
        <ModalTitleWithIcon
          isEditMode={false}
          title={t('Create Event')}
          data-test="event-modal-title"
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
          data-test="event-name-input"
          onChange={handleNameChange}
          type="text"
          value={name}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">{t('Description')}</div>
        <Input.TextArea
          name="description"
          data-test="event-description-input"
          onChange={handleDescriptionChange}
          rows={4}
          value={description}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">
          {t('Group')}
          <span className="required">*</span>
        </div>
        <Select
          ariaLabel={t('Group')}
          options={EVENT_GROUP_OPTIONS.map(group => ({
            label: group.label,
            value: group.id,
          }))}
          value={groupId}
          onChange={handleGroupChange}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">
          {t('Events')}
          <span className="required">*</span>
        </div>
        <Select
          ariaLabel={t('Events')}
          disabled={!groupId}
          placeholder={groupId ? undefined : t('Select a Group first')}
          options={eventTypeOptions.map(eventType => ({
            label: eventType.label,
            value: eventType.id,
          }))}
          value={eventTypeId}
          onChange={(value: string) => setEventTypeId(value)}
        />
      </FieldContainer>
    </Modal>
  );
}
