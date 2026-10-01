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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import { Label } from '@superset-ui/core/components';
import SubMenu from 'src/features/home/SubMenu';
import {
  ListView,
  ListViewFilterOperator as FilterOperator,
  type ListViewFilters,
} from 'src/components';
import withToasts from 'src/components/MessageToasts/withToasts';
import { useMockListState } from 'src/features/actions/hooks/useMockListState';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationRecord,
} from 'src/features/actions/data/notifications';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';

const PAGE_SIZE = 25;

const TitleCell = styled.span<{ read: boolean }>`
  ${({ theme, read }) => css`
    cursor: pointer;
    font-weight: ${read ? theme.fontWeightNormal : theme.fontWeightStrong};

    &:hover {
      color: ${theme.colorPrimary};
    }
  `}
`;

interface NotificationListProps {
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
}

function NotificationList({
  addDangerToast,
  addSuccessToast,
}: NotificationListProps) {
  const history = useHistory();
  const user = useSelector<any, UserWithPermissionsAndRoles>(
    state => state.user,
  );
  const userId = user?.userId;

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    fetchNotifications(userId, addDangerToast).then(items => {
      setNotifications(items);
      setLoading(false);
    });
  }, [userId, addDangerToast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const { rows, count, fetchData } =
    useMockListState<NotificationRecord>(notifications);

  const unreadIds = useMemo(
    () => notifications.filter(item => !item.read).map(item => item.id),
    [notifications],
  );

  const handleRowClick = useCallback(
    (notification: NotificationRecord) => {
      if (userId && !notification.read) {
        markNotificationRead(userId, notification.id, addDangerToast);
        setNotifications(prev =>
          prev.map(item =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );
      }
      history.push(`/notification/${notification.id}`);
    },
    [userId, addDangerToast, history],
  );

  const handleMarkAllRead = useCallback(() => {
    if (!userId || unreadIds.length === 0) return;
    markAllNotificationsRead(userId, unreadIds, addDangerToast).then(
      success => {
        if (!success) return;
        setNotifications(prev => prev.map(item => ({ ...item, read: true })));
        addSuccessToast(t('All notifications marked as read'));
      },
    );
  }, [userId, unreadIds, addDangerToast, addSuccessToast]);

  const columns = useMemo(
    () => [
      {
        Cell: ({
          row: { original },
        }: {
          row: { original: NotificationRecord };
        }) => (
          <TitleCell
            read={original.read}
            role="button"
            tabIndex={0}
            onClick={() => handleRowClick(original)}
          >
            {original.title}
          </TitleCell>
        ),
        accessor: 'title',
        Header: t('Title'),
        id: 'title',
        size: 'xl',
      },
      {
        accessor: 'channel',
        Header: t('Channel'),
        id: 'channel',
        size: 'sm',
      },
      {
        Cell: ({
          row: { original },
        }: {
          row: { original: NotificationRecord };
        }) => (
          <Label type={original.read ? 'default' : 'success'}>
            {original.read ? t('Read') : t('Unread')}
          </Label>
        ),
        accessor: 'read',
        Header: t('Status'),
        id: 'read',
        size: 'sm',
      },
      {
        accessor: 'created_at',
        Header: t('Received'),
        id: 'created_at',
        size: 'lg',
      },
    ],
    [handleRowClick],
  );

  const filters: ListViewFilters = useMemo(
    () => [
      {
        Header: t('Title'),
        key: 'search',
        id: 'title',
        input: 'search',
        operator: FilterOperator.Contains,
      },
      {
        Header: t('Status'),
        key: 'read',
        id: 'read',
        input: 'select',
        operator: FilterOperator.Equals,
        unfilteredLabel: t('All'),
        selects: [
          { label: t('Unread'), value: false },
          { label: t('Read'), value: true },
        ],
      },
    ],
    [],
  );

  return (
    <>
      <SubMenu
        name={t('Notifications')}
        buttons={
          unreadIds.length > 0
            ? [
                {
                  name: t('Mark all as read'),
                  buttonStyle: 'secondary',
                  onClick: handleMarkAllRead,
                  'data-test': 'mark-all-read',
                },
              ]
            : []
        }
      />
      <ListView<NotificationRecord>
        className="notification-list-view"
        columns={columns}
        data={rows}
        count={count}
        pageSize={PAGE_SIZE}
        fetchData={fetchData}
        filters={filters}
        loading={loading}
        addDangerToast={addDangerToast}
        addSuccessToast={addSuccessToast}
        refreshData={refreshData}
      />
    </>
  );
}

export default withToasts(NotificationList);
