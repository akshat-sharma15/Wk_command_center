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
import { css, styled } from '@apache-superset/core/theme';
import { Card } from '@superset-ui/core/components';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
}

const StatCardBody = styled.div(
  ({ theme }) => css`
    display: flex;
    align-items: center;
    gap: ${theme.sizeUnit * 3}px;
  `,
);

const IconBadge = styled.span(
  ({ theme }) => css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${theme.sizeUnit * 8}px;
    height: ${theme.sizeUnit * 8}px;
    border-radius: ${theme.borderRadius}px;
    background: ${theme.colorPrimaryBg};
    color: ${theme.colorPrimary};
    font-size: ${theme.fontSizeLG}px;
    flex: 0 0 auto;
  `,
);

const StatText = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    min-width: 0;

    span:first-of-type {
      font-size: ${theme.fontSizeXL}px;
      font-weight: ${theme.fontWeightBold};
      color: ${theme.colorText};
      line-height: 1.2;
    }

    span:last-of-type {
      font-size: ${theme.fontSizeSM}px;
      color: ${theme.colorTextSecondary};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `,
);

/**
 * A small stat tile used to build a KPI strip on top of a list page. Reuses
 * the same `Card` shell as DisabledIntegrationCard/SlackConnectionCard so all
 * Action Center cards share one visual language.
 */
export default function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card data-test={`stat-card-${label.toLowerCase()}`}>
      <StatCardBody>
        <IconBadge>{icon}</IconBadge>
        <StatText>
          <span>{value}</span>
          <span title={label}>{label}</span>
        </StatText>
      </StatCardBody>
    </Card>
  );
}
