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
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import { EmptyState, Loading } from '@superset-ui/core/components';
import SubMenu from 'src/features/home/SubMenu';
import { Descriptions } from 'src/components/Descriptions';
import { fetchNotificationById } from 'src/features/actions/data/notifications';
import { NotificationRecord } from 'src/features/actions/data/types';

const DescriptionsContainer = styled.div`
  ${({ theme }) => css`
    margin: 0 ${theme.sizeUnit * 3}px ${theme.sizeUnit * 6}px
      ${theme.sizeUnit * 3}px;
    background-color: ${theme.colorBgContainer};
  `}
`;

export default function NotificationDetail() {
  const { notificationId } = useParams<{ notificationId: string }>();
  const [notification, setNotification] = useState<NotificationRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchNotificationById(Number(notificationId)).then(result => {
      setNotification(result ?? null);
      setLoading(false);
    });
  }, [notificationId]);

  return (
    <>
      <SubMenu name={t('Notification')} />
      {loading && <Loading />}
      {!loading && !notification && (
        <EmptyState title={t('Notification not found')} image="empty.svg" />
      )}
      {!loading && notification && (
        <DescriptionsContainer>
          <Descriptions
            bordered
            size="small"
            column={1}
            labelStyle={{ width: '160px' }}
          >
            <Descriptions.Item label={t('Name')}>
              {notification.name}
            </Descriptions.Item>
            <Descriptions.Item label={t('Description')}>
              {notification.description}
            </Descriptions.Item>
            <Descriptions.Item label={t('Priority')}>
              {notification.priority}
            </Descriptions.Item>
          </Descriptions>
        </DescriptionsContainer>
      )}
    </>
  );
}
