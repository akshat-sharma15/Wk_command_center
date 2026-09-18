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
import { useHistory } from 'react-router-dom';
import { t } from '@apache-superset/core/translation';
import { styled } from '@apache-superset/core/theme';
import { Badge, Popover } from '@superset-ui/core/components';
import { Icons } from '@superset-ui/core/components/Icons';
import {
  fetchNotificationCount,
  fetchNotifications,
} from './data/notifications';
import { NotificationRecord } from './data/types';

const BellWrapper = styled.span`
  cursor: pointer;
  display: inline-flex;
  align-items: center;
`;

const PanelContainer = styled.div`
  width: 320px;
  max-height: 360px;
  display: flex;
  flex-direction: column;
`;

const PanelHeader = styled.div`
  ${({ theme }) => `
    font-weight: ${theme.fontWeightStrong};
    padding: ${theme.sizeUnit * 2}px ${theme.sizeUnit * 3}px;
    border-bottom: 1px solid ${theme.colorBorder};
  `}
`;

const PanelBody = styled.div`
  overflow-y: auto;
`;

const NotificationItem = styled.div`
  ${({ theme }) => `
    padding: ${theme.sizeUnit * 2}px ${theme.sizeUnit * 3}px;
    cursor: pointer;
    border-bottom: 1px solid ${theme.colorBorderSecondary};

    &:hover {
      background-color: ${theme.colorBgTextHover};
    }

    &:last-child {
      border-bottom: none;
    }
  `}
`;

const EmptyState = styled.div`
  ${({ theme }) => `
    padding: ${theme.sizeUnit * 4}px ${theme.sizeUnit * 3}px;
    color: ${theme.colorTextSecondary};
    text-align: center;
  `}
`;

export default function NotificationBell() {
  const history = useHistory();
  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchNotificationCount().then(setCount);
  }, []);

  const handleVisibleChange = (nextVisible: boolean) => {
    setVisible(nextVisible);
    if (nextVisible) {
      fetchNotifications().then(setNotifications);
    }
  };

  const handleSelectNotification = (id: number) => {
    setVisible(false);
    history.push(`/notification/${id}`);
  };

  const content = (
    <PanelContainer>
      <PanelHeader>{t('Notifications')}</PanelHeader>
      <PanelBody>
        {notifications.length === 0 ? (
          <EmptyState>{t('No notifications')}</EmptyState>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectNotification(notification.id)}
            >
              {notification.name}
            </NotificationItem>
          ))
        )}
      </PanelBody>
    </PanelContainer>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      visible={visible}
      onVisibleChange={handleVisibleChange}
    >
      <BellWrapper data-test="notification-bell" title={t('Notifications')}>
        <Badge count={count} size="small" offset={[-2, 2]}>
          <Icons.BellOutlined />
        </Badge>
      </BellWrapper>
    </Popover>
  );
}
