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
import StatCard from '../../actions/components/StatCard';

export interface KpiStripItem {
  key: string;
  icon: ReactNode;
  label: string;
  value: number;
}

const Strip = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-wrap: wrap;
    gap: ${theme.sizeUnit * 4}px;
    margin: 0 ${theme.sizeUnit * 4}px ${theme.sizeUnit * 4}px;

    > div {
      flex: 1 1 180px;
    }
  `,
);

export default function KpiStrip({ items }: { items: KpiStripItem[] }) {
  return (
    <Strip>
      {items.map(({ key, icon, label, value }) => (
        <StatCard key={key} icon={icon} label={label} value={value} />
      ))}
    </Strip>
  );
}
