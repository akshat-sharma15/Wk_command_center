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
import { t } from '@apache-superset/core/translation';
import { DeleteModal } from '@superset-ui/core/components';
import { Icons } from '@superset-ui/core/components/Icons';
import SubMenu from 'src/features/home/SubMenu';
import {
  ListView,
  ListViewActionsBar,
  ListViewFilterOperator as FilterOperator,
  type ListViewActionProps,
  type ListViewFilters,
} from 'src/components';
import withToasts from 'src/components/MessageToasts/withToasts';
import { actionMenuData } from 'src/features/home/actionMenuData';
import { useMockListState } from 'src/features/actions/hooks/useMockListState';
import StatusLabel from 'src/features/actions/components/StatusLabel';
import {
  fetchEvents,
  createEvent,
  deleteEvent,
} from 'src/features/actions/data/events';
import {
  EVENT_GROUP_OPTIONS,
  findEventGroupOption,
  findEventTypeOption,
} from 'src/features/actions/data/eventGroups';
import { EventRecord } from 'src/features/actions/data/types';
import EventModal from 'src/features/actions/EventModal';

const PAGE_SIZE = 25;

interface EventListProps {
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
}

function EventList({ addDangerToast, addSuccessToast }: EventListProps) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshData = useCallback(() => {
    setLoading(true);
    fetchEvents().then(items => {
      setEvents(items);
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    refreshData();
  }, [refreshData]);
  const { rows, count, fetchData } = useMockListState<EventRecord>(events);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalInstanceKey, setModalInstanceKey] = useState(0);
  const [eventCurrentlyDeleting, setEventCurrentlyDeleting] =
    useState<EventRecord | null>(null);

  const handleCreate = useCallback(
    (input: {
      name: string;
      description: string;
      groupId: string;
      eventTypeId: string;
    }) => {
      createEvent(input).then(() => {
        setCreateModalOpen(false);
        refreshData();
        addSuccessToast(t('Event created'));
      });
    },
    [refreshData, addSuccessToast],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!eventCurrentlyDeleting) return;
    deleteEvent(eventCurrentlyDeleting.id).then(() => {
      addSuccessToast(t('Deleted: %s', eventCurrentlyDeleting.name));
      setEventCurrentlyDeleting(null);
      refreshData();
    });
  }, [eventCurrentlyDeleting, refreshData, addSuccessToast]);

  const columns = useMemo(
    () => [
      { accessor: 'name', Header: t('Name'), id: 'name', size: 'xl' },
      {
        Cell: ({ row: { original } }: { row: { original: EventRecord } }) =>
          findEventGroupOption(original.groupId)?.label ?? original.groupId,
        accessor: 'groupId',
        Header: t('Group'),
        id: 'groupId',
        size: 'lg',
      },
      {
        Cell: ({ row: { original } }: { row: { original: EventRecord } }) =>
          findEventTypeOption(original.eventTypeId)?.label ??
          original.eventTypeId,
        accessor: 'eventTypeId',
        Header: t('Event'),
        id: 'eventTypeId',
        size: 'lg',
      },
      {
        Cell: ({ row: { original } }: { row: { original: EventRecord } }) => (
          <StatusLabel status={original.status} />
        ),
        accessor: 'status',
        Header: t('Status'),
        id: 'status',
        size: 'sm',
      },
      {
        accessor: 'description',
        Header: t('Description'),
        id: 'description',
        disableSortBy: true,
        size: 'xxl',
      },
      {
        accessor: 'changed_by_name',
        Header: t('Modified by'),
        id: 'changed_by_name',
        size: 'lg',
      },
      {
        accessor: 'changed_on_delta_humanized',
        Header: t('Last modified'),
        id: 'changed_on_delta_humanized',
        size: 'lg',
      },
      {
        Cell: ({ row: { original } }: { row: { original: EventRecord } }) => {
          const actions: ListViewActionProps[] = [
            {
              label: 'delete-action',
              tooltip: t('Delete event'),
              placement: 'bottom',
              icon: 'DeleteOutlined',
              onClick: () => setEventCurrentlyDeleting(original),
            },
          ];
          return <ListViewActionsBar actions={actions} />;
        },
        Header: t('Actions'),
        id: 'actions',
        disableSortBy: true,
        size: 'xl',
      },
    ],
    [],
  );

  const filters: ListViewFilters = useMemo(
    () => [
      {
        Header: t('Name'),
        key: 'search',
        id: 'name',
        input: 'search',
        operator: FilterOperator.Contains,
      },
      {
        Header: t('Group'),
        key: 'groupId',
        id: 'groupId',
        input: 'select',
        operator: FilterOperator.Equals,
        unfilteredLabel: t('All'),
        selects: EVENT_GROUP_OPTIONS.map(group => ({
          label: group.label,
          value: group.id,
        })),
      },
      {
        Header: t('Status'),
        key: 'status',
        id: 'status',
        input: 'select',
        operator: FilterOperator.Equals,
        unfilteredLabel: t('All'),
        selects: (['Active', 'Inactive', 'Draft'] as const).map(status => ({
          label: status,
          value: status,
        })),
      },
    ],
    [],
  );

  return (
    <>
      <SubMenu
        name={t('Events')}
        activeChild="Event"
        tabs={actionMenuData.tabs}
        buttons={[
          {
            icon: <Icons.PlusOutlined iconSize="m" />,
            name: t('Event'),
            onClick: () => {
              setModalInstanceKey(key => key + 1);
              setCreateModalOpen(true);
            },
            buttonStyle: 'primary',
          },
        ]}
      />
      <EventModal
        key={modalInstanceKey}
        show={createModalOpen}
        onHide={() => setCreateModalOpen(false)}
        onSave={handleCreate}
      />
      {eventCurrentlyDeleting && (
        <DeleteModal
          description={t(
            'This will permanently remove this event. This action cannot be undone.',
          )}
          onConfirm={handleDeleteConfirm}
          onHide={() => setEventCurrentlyDeleting(null)}
          open
          title={t('Delete %s?', eventCurrentlyDeleting.name)}
        />
      )}
      <ListView<EventRecord>
        className="event-list-view"
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

export default withToasts(EventList);
