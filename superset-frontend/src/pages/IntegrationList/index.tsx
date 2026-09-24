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
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import { Icons } from '@superset-ui/core/components/Icons';
import SubMenu from 'src/features/home/SubMenu';
import withToasts from 'src/components/MessageToasts/withToasts';
import { actionMenuData } from 'src/features/home/actionMenuData';
import SlackConnectionCard from 'src/features/actions/SlackConnectionCard';
import DisabledIntegrationCard from 'src/features/actions/DisabledIntegrationCard';

// --- Imports used only by the static integration list / Create Integration
// flow below, which is temporarily hidden (see the commented-out block at
// the bottom of this component). Kept here, still commented, so restoring
// that flow later is a matter of uncommenting rather than re-deriving it.
// import { useCallback, useEffect, useMemo, useState } from 'react';
// import { DeleteModal } from '@superset-ui/core/components';
// import {
//   ListView,
//   ListViewActionsBar,
//   ListViewFilterOperator as FilterOperator,
//   type ListViewActionProps,
//   type ListViewFilters,
// } from 'src/components';
// import { useMockListState } from 'src/features/actions/hooks/useMockListState';
// import StatusLabel from 'src/features/actions/components/StatusLabel';
// import {
//   fetchIntegrations,
//   createIntegration,
//   deleteIntegration,
// } from 'src/features/actions/data/integrations';
// import { Integration } from 'src/features/actions/data/types';
// import IntegrationModal from 'src/features/actions/IntegrationModal';

// const PAGE_SIZE = 25;

const CardsGrid = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: ${theme.sizeUnit * 4}px;
    margin: ${theme.sizeUnit * 4}px ${theme.sizeUnit * 4}px 0;

    > * {
      width: 100%;
    }
  `,
);

interface IntegrationListProps {
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
}

function IntegrationList({
  addDangerToast,
  addSuccessToast,
}: IntegrationListProps) {
  // --- Static integration list / Create Integration state (hidden for now)
  // const [integrations, setIntegrations] = useState<Integration[]>([]);
  // const [loading, setLoading] = useState(true);
  // const refreshData = useCallback(() => {
  //   setLoading(true);
  //   fetchIntegrations().then(items => {
  //     setIntegrations(items);
  //     setLoading(false);
  //   });
  // }, []);
  // useEffect(() => {
  //   refreshData();
  // }, [refreshData]);
  // const { rows, count, fetchData } =
  //   useMockListState<Integration>(integrations);
  // const [createModalOpen, setCreateModalOpen] = useState(false);
  // const [modalInstanceKey, setModalInstanceKey] = useState(0);
  // const [integrationCurrentlyDeleting, setIntegrationCurrentlyDeleting] =
  //   useState<Integration | null>(null);
  //
  // const handleCreate = useCallback(
  //   (input: { name: string; type: string; description: string }) => {
  //     createIntegration(input).then(() => {
  //       setCreateModalOpen(false);
  //       refreshData();
  //       addSuccessToast(t('Integration created'));
  //     });
  //   },
  //   [refreshData, addSuccessToast],
  // );
  //
  // const handleDeleteConfirm = useCallback(() => {
  //   if (!integrationCurrentlyDeleting) return;
  //   deleteIntegration(integrationCurrentlyDeleting.id).then(() => {
  //     addSuccessToast(t('Deleted: %s', integrationCurrentlyDeleting.name));
  //     setIntegrationCurrentlyDeleting(null);
  //     refreshData();
  //   });
  // }, [integrationCurrentlyDeleting, refreshData, addSuccessToast]);
  //
  // const columns = useMemo(
  //   () => [
  //     { accessor: 'name', Header: t('Name'), id: 'name', size: 'xl' },
  //     {
  //       accessor: 'type',
  //       Header: t('Integration type'),
  //       id: 'type',
  //       size: 'lg',
  //     },
  //     {
  //       Cell: ({ row: { original } }: { row: { original: Integration } }) => (
  //         <StatusLabel status={original.status} />
  //       ),
  //       accessor: 'status',
  //       Header: t('Status'),
  //       id: 'status',
  //       size: 'sm',
  //     },
  //     {
  //       accessor: 'description',
  //       Header: t('Description'),
  //       id: 'description',
  //       disableSortBy: true,
  //       size: 'xxl',
  //     },
  //     {
  //       accessor: 'changed_by_name',
  //       Header: t('Modified by'),
  //       id: 'changed_by_name',
  //       size: 'lg',
  //     },
  //     {
  //       accessor: 'changed_on_delta_humanized',
  //       Header: t('Last modified'),
  //       id: 'changed_on_delta_humanized',
  //       size: 'lg',
  //     },
  //     {
  //       Cell: ({ row: { original } }: { row: { original: Integration } }) => {
  //         const actions: ListViewActionProps[] = [
  //           {
  //             label: 'delete-action',
  //             tooltip: t('Delete integration'),
  //             placement: 'bottom',
  //             icon: 'DeleteOutlined',
  //             onClick: () => setIntegrationCurrentlyDeleting(original),
  //           },
  //         ];
  //         return <ListViewActionsBar actions={actions} />;
  //       },
  //       Header: t('Actions'),
  //       id: 'actions',
  //       disableSortBy: true,
  //       size: 'xl',
  //     },
  //   ],
  //   [],
  // );
  //
  // const filters: ListViewFilters = useMemo(
  //   () => [
  //     {
  //       Header: t('Name'),
  //       key: 'search',
  //       id: 'name',
  //       input: 'search',
  //       operator: FilterOperator.Contains,
  //     },
  //     {
  //       Header: t('Status'),
  //       key: 'status',
  //       id: 'status',
  //       input: 'select',
  //       operator: FilterOperator.Equals,
  //       unfilteredLabel: t('All'),
  //       selects: (['Active', 'Inactive', 'Draft'] as const).map(status => ({
  //         label: status,
  //         value: status,
  //       })),
  //     },
  //   ],
  //   [],
  // );

  return (
    <>
      <SubMenu
        name={t('Integrations')}
        activeChild="Integration"
        tabs={actionMenuData.tabs}
        // "Create Integration" is hidden for now - integrations are
        // connected via the cards below instead. Re-add this `buttons`
        // array to restore the modal-based creation flow.
        // buttons={[
        //   {
        //     icon: <Icons.PlusOutlined iconSize="m" />,
        //     name: t('Integration'),
        //     onClick: () => {
        //       setModalInstanceKey(key => key + 1);
        //       setCreateModalOpen(true);
        //     },
        //     buttonStyle: 'primary',
        //   },
        // ]}
      />
      <CardsGrid>
        <SlackConnectionCard
          addDangerToast={addDangerToast}
          addSuccessToast={addSuccessToast}
        />
        <DisabledIntegrationCard
          name={t('SMS')}
          icon={<Icons.MobileOutlined />}
        />
        <DisabledIntegrationCard
          name={t('Email')}
          icon={<Icons.MailOutlined />}
        />
        <DisabledIntegrationCard
          name={t('WhatsApp')}
          icon={<Icons.WhatsAppOutlined />}
        />
      </CardsGrid>
      {/* --- Static integration list / Create Integration flow (hidden for
        now; the mock data layer in data/integrations.ts is untouched so
        this can come back once these integrations are API-backed). ---
      <IntegrationModal
        key={modalInstanceKey}
        show={createModalOpen}
        onHide={() => setCreateModalOpen(false)}
        onSave={handleCreate}
      />
      {integrationCurrentlyDeleting && (
        <DeleteModal
          description={t(
            'This will permanently remove this integration. This action cannot be undone.',
          )}
          onConfirm={handleDeleteConfirm}
          onHide={() => setIntegrationCurrentlyDeleting(null)}
          open
          title={t('Delete %s?', integrationCurrentlyDeleting.name)}
        />
      )}
      <ListView<Integration>
        className="integration-list-view"
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
      --- end hidden block --- */}
    </>
  );
}

export default withToasts(IntegrationList);
