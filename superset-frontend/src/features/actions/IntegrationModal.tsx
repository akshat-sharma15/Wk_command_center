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
import { useState, ChangeEvent } from 'react';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import { Input, Modal, Select } from '@superset-ui/core/components';
import { ModalTitleWithIcon } from 'src/components/ModalTitleWithIcon';
import { INTEGRATION_TYPE_OPTIONS } from './data/integrations';

interface IntegrationModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (input: { name: string; type: string; description: string }) => void;
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

export default function IntegrationModal({
  show,
  onHide,
  onSave,
}: IntegrationModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState(INTEGRATION_TYPE_OPTIONS[0] ?? '');
  const [description, setDescription] = useState('');

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.target.value);
  };

  const handleSave = () => {
    onSave({ name, type, description });
  };

  return (
    <Modal
      disablePrimaryButton={!name || !type}
      onHandledPrimaryAction={handleSave}
      onHide={onHide}
      primaryButtonName={t('Create')}
      show={show}
      width="55%"
      title={
        <ModalTitleWithIcon
          isEditMode={false}
          title={t('Create Integration')}
          data-test="integration-modal-title"
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
          data-test="integration-name-input"
          onChange={handleNameChange}
          type="text"
          value={name}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">
          {t('Integration type')}
          <span className="required">*</span>
        </div>
        <Select
          ariaLabel={t('Integration type')}
          options={INTEGRATION_TYPE_OPTIONS.map(option => ({
            label: option,
            value: option,
          }))}
          value={type || undefined}
          onChange={(value: string) => setType(value)}
        />
      </FieldContainer>
      <FieldContainer>
        <div className="control-label">{t('Description')}</div>
        <Input.TextArea
          name="description"
          data-test="integration-description-input"
          onChange={handleDescriptionChange}
          rows={4}
          value={description}
        />
      </FieldContainer>
    </Modal>
  );
}
