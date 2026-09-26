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
import { Icons } from '@superset-ui/core/components/Icons';
import SubMenu from 'src/features/home/SubMenu';
import {
  ListView,
  ListViewFilterOperator as FilterOperator,
  type ListViewFilters,
} from 'src/components';
import withToasts from 'src/components/MessageToasts/withToasts';
import { actionMenuData } from 'src/features/home/actionMenuData';
import { useMockListState } from 'src/features/actions/hooks/useMockListState';
import {
  fetchEvents,
  createEvent,
  updateEvent,
} from 'src/features/actions/data/events';
import {
  EVENT_GROUP_OPTIONS,
  findEventGroupOption,
  findEventTypeOption,
} from 'src/features/actions/data/eventGroups';
import { EventRecord } from 'src/features/actions/data/types';
import EventModal from 'src/features/actions/EventModal';
import KpiStrip, {
  KpiStripItem,
} from 'src/features/actions/components/KpiStrip';

const GROUP_ICONS: Record<string, JSX.Element> = {
  Hubs: <Icons.ShopOutlined />,
  'Fleet / Transport': <Icons.CarOutlined />,
  Workforce: <Icons.TeamOutlined />,
  Sales: <Icons.LineChartOutlined />,
  Finance: <Icons.DollarOutlined />,
};

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
    fetchEvents(addDangerToast).then(items => {
      setEvents(items);
      setLoading(false);
    });
  }, [addDangerToast]);
  useEffect(() => {
    refreshData();
  }, [refreshData]);
  const { rows, count, fetchData } = useMockListState<EventRecord>(events);
  const [modalOpen, setModalOpen] = useState(false);
  const [eventBeingEdited, setEventBeingEdited] = useState<EventRecord | null>(
    null,
  );

  const handleSave = useCallback(
    (input: { name: string; groupId: string; eventTypeId: string }) => {
      const save = eventBeingEdited
        ? updateEvent(eventBeingEdited.id, input, addDangerToast)
        : createEvent(input, addDangerToast);
      save.then(saved => {
        if (!saved) return; // error already toasted by data/events.ts
        setModalOpen(false);
        setEventBeingEdited(null);
        refreshData();
        addSuccessToast(
          eventBeingEdited ? t('Incident updated') : t('Incident created'),
        );
      });
    },
    [eventBeingEdited, refreshData, addSuccessToast, addDangerToast],
  );

  const kpiItems: KpiStripItem[] = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach(event => {
      counts.set(event.groupId, (counts.get(event.groupId) ?? 0) + 1);
    });
    return [
      {
        key: 'total',
        icon: <Icons.WarningOutlined />,
        label: t('Total Incidents'),
        value: events.length,
      },
      ...EVENT_GROUP_OPTIONS.map(group => ({
        key: group.id,
        icon: GROUP_ICONS[group.id] ?? <Icons.WarningOutlined />,
        label: group.label,
        value: counts.get(group.id) ?? 0,
      })),
    ];
  }, [events]);

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
        Header: t('Incident'),
        id: 'eventTypeId',
        size: 'lg',
      },
      {
        accessor: 'changed_on_delta_humanized',
        Header: t('Last modified'),
        id: 'changed_on_delta_humanized',
        size: 'lg',
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
    ],
    [],
  );

  return (
    <>
      <SubMenu
        name={t('Incidents')}
        activeChild="Event"
        tabs={actionMenuData.tabs}
        // Incident creation is temporarily disabled - keep the button
        // definition here, commented out, so it can be re-enabled later.
        // buttons={[
        //   {
        //     icon: <Icons.PlusOutlined iconSize="m" />,
        //     name: t('Incident'),
        //     onClick: () => {
        //       setEventBeingEdited(null);
        //       setModalOpen(true);
        //     },
        //     buttonStyle: 'primary',
        //   },
        // ]}
      />
      <EventModal
        show={modalOpen}
        event={eventBeingEdited}
        onHide={() => {
          setModalOpen(false);
          setEventBeingEdited(null);
        }}
        onSave={handleSave}
      />
      <KpiStrip items={kpiItems} />
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
