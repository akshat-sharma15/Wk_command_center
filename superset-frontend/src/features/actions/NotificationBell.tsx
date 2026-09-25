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
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { t } from '@apache-superset/core/translation';
import { styled } from '@apache-superset/core/theme';
import { Badge, Popover } from '@superset-ui/core/components';
import { Icons } from '@superset-ui/core/components/Icons';
import { addDangerToast } from 'src/components/MessageToasts/actions';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import {
  fetchNotifications,
  fetchUnreadNotifications,
  fetchSseTicket,
  markNotificationRead,
  notificationStreamUrl,
  NotificationRecord,
} from './data/notifications';

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

const NotificationItem = styled.div<{ read: boolean }>`
  ${({ theme, read }) => `
    padding: ${theme.sizeUnit * 2}px ${theme.sizeUnit * 3}px;
    cursor: pointer;
    border-bottom: 1px solid ${theme.colorBorderSecondary};
    font-weight: ${read ? theme.fontWeightNormal : theme.fontWeightStrong};

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
  const dispatch = useDispatch();
  const danger = useCallback(
    (message: string) => dispatch(addDangerToast(message)),
    [dispatch],
  );
  const user = useSelector<any, UserWithPermissionsAndRoles>(
    state => state.user,
  );
  const userId = user?.userId;

  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Initial unread notifications + count, and the realtime SSE connection.
  // Missed-during-disconnect notifications are recovered simply by this
  // unread fetch running again on remount/reconnect - the durable source
  // of truth is always the backend, never anything buffered client-side
  // only in this effect.
  useEffect(() => {
    if (!userId) return undefined;

    fetchUnreadNotifications(userId, danger).then(items => {
      setNotifications(items);
      setUnreadCount(items.length);
    });

    let cancelled = false;
    fetchSseTicket(userId, danger).then(ticket => {
      if (!ticket || cancelled) return;
      const source = new EventSource(notificationStreamUrl(ticket));
      eventSourceRef.current = source;
      source.addEventListener('notification', (event: MessageEvent) => {
        const notification = JSON.parse(event.data) as NotificationRecord;
        setNotifications(prev => [ notification, ...prev ]);
        setUnreadCount(prev => prev + 1);
      });
    });

    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [userId, danger]);

  const handleVisibleChange = (nextVisible: boolean) => {
    setVisible(nextVisible);
    if (nextVisible && userId) {
      fetchNotifications(userId, danger).then(setNotifications);
    }
  };

  const handleSelectNotification = (notification: NotificationRecord) => {
    setVisible(false);
    if (userId && !notification.read) {
      markNotificationRead(userId, notification.id, danger);
      setNotifications(prev =>
        prev.map(item =>
          item.id === notification.id ? { ...item, read: true } : item,
        ),
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    history.push(`/notification/${notification.id}`);
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
              read={notification.read}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectNotification(notification)}
            >
              {notification.title}
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
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <Icons.BellOutlined />
        </Badge>
      </BellWrapper>
    </Popover>
  );
}
