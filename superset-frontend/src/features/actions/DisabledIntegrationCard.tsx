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
import { ReactNode } from 'react';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import { Button, Card, Tooltip } from '@superset-ui/core/components';

interface DisabledIntegrationCardProps {
  name: string;
  icon: ReactNode;
}

const CardTitle = styled.span(
  ({ theme }) => css`
    display: inline-flex;
    align-items: center;
    gap: ${theme.sizeUnit * 2}px;
  `,
);

const CardBody = styled.div(
  ({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${theme.sizeUnit * 4}px;
    color: ${theme.colorTextSecondary};
  `,
);

/**
 * A placeholder "coming soon" card for integrations that aren't connectable
 * yet (see IntegrationList). Mirrors SlackConnectionCard's card shell so all
 * four integration blocks look consistent - unlike Slack, these have no
 * connect flow of their own yet, just a disabled action.
 */
export default function DisabledIntegrationCard({
  name,
  icon,
}: DisabledIntegrationCardProps) {
  return (
    <Card
      title={
        <CardTitle>
          {icon} {name}
        </CardTitle>
      }
      data-test={`disabled-integration-card-${name.toLowerCase()}`}
    >
      <CardBody>
        <div>{t('Not Connected')}</div>
        <Tooltip title={t('%s integration is coming soon', name)}>
          <span>
            <Button
              buttonStyle="primary"
              disabled
              data-test={`disabled-integration-connect-${name.toLowerCase()}`}
            >
              {t('Connect')}
            </Button>
          </span>
        </Tooltip>
      </CardBody>
    </Card>
  );
}
