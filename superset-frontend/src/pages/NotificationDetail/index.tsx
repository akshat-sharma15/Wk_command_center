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
import { useSelector, useDispatch } from 'react-redux';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import { EmptyState, Loading } from '@superset-ui/core/components';
import SubMenu from 'src/features/home/SubMenu';
import { Descriptions } from 'src/components/Descriptions';
import { addDangerToast } from 'src/components/MessageToasts/actions';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import {
  fetchNotificationById,
  NotificationRecord,
} from 'src/features/actions/data/notifications';

const DescriptionsContainer = styled.div`
  ${({ theme }) => css`
    margin: 0 ${theme.sizeUnit * 3}px ${theme.sizeUnit * 6}px
      ${theme.sizeUnit * 3}px;
    background-color: ${theme.colorBgContainer};
  `}
`;

export default function NotificationDetail() {
  const dispatch = useDispatch();
  const user = useSelector<any, UserWithPermissionsAndRoles>(
    state => state.user,
  );
  const { notificationId } = useParams<{ notificationId: string }>();
  const [notification, setNotification] = useState<NotificationRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.userId) return;
    setLoading(true);
    fetchNotificationById(user.userId, Number(notificationId), message =>
      dispatch(addDangerToast(message)),
    ).then(result => {
      setNotification(result);
      setLoading(false);
    });
  }, [notificationId, user?.userId, dispatch]);

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
            <Descriptions.Item label={t('Title')}>
              {notification.title}
            </Descriptions.Item>
            <Descriptions.Item label={t('Message')}>
              {notification.message}
            </Descriptions.Item>
            <Descriptions.Item label={t('Channel')}>
              {notification.channel}
            </Descriptions.Item>
            <Descriptions.Item label={t('Status')}>
              {notification.status}
            </Descriptions.Item>
          </Descriptions>
        </DescriptionsContainer>
      )}
    </>
  );
}
