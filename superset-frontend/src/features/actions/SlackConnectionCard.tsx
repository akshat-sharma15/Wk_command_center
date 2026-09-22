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
import { useCallback, useEffect, useState } from 'react';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import { Button, Card, Loading } from '@superset-ui/core/components';
import {
  fetchSlackStatus,
  startSlackConnect,
  disconnectSlack,
  SlackStatus,
} from './data/slackIntegration';

interface SlackConnectionCardProps {
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
}

const CardBody = styled.div(
  ({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${theme.sizeUnit * 4}px;

    .slack-status-label {
      color: ${theme.colorTextSecondary};
      margin-bottom: ${theme.sizeUnit}px;
    }

    .slack-workspace {
      margin-top: ${theme.sizeUnit}px;
    }
  `,
);

// Reads the `?slack=success|error&reason=...` query params the OAuth
// callback redirect leaves on the URL, surfaces a toast for them, then
// strips them so a page refresh doesn't re-show the toast.
function useSlackOAuthRedirectResult(
  addDangerToast: (msg: string) => void,
  addSuccessToast: (msg: string) => void,
  onSuccess: () => void,
) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('slack');
    if (!result) return;

    if (result === 'success') {
      addSuccessToast(t('Slack connected'));
      onSuccess();
    } else {
      addDangerToast(
        t('Slack connection failed (%s)', params.get('reason') ?? t('unknown error')),
      );
    }

    params.delete('slack');
    params.delete('reason');
    const search = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${search ? `?${search}` : ''}`,
    );
    // Intentionally run once on mount only - this reads the URL exactly as
    // it was on page load after the OAuth redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function SlackConnectionCard({
  addDangerToast,
  addSuccessToast,
}: SlackConnectionCardProps) {
  const [status, setStatus] = useState<SlackStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchSlackStatus(addDangerToast).then(result => {
      setStatus(result);
      setLoading(false);
    });
  }, [addDangerToast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useSlackOAuthRedirectResult(addDangerToast, addSuccessToast, refresh);

  const handleConnect = async () => {
    setConnecting(true);
    const authorizationUrl = await startSlackConnect(addDangerToast);
    if (authorizationUrl) {
      window.location.href = authorizationUrl;
    } else {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!status.integration) return;
    setDisconnecting(true);
    const success = await disconnectSlack(status.integration.id, addDangerToast);
    setDisconnecting(false);
    if (success) {
      addSuccessToast(t('Slack disconnected'));
      refresh();
    }
  };

  return (
    <Card title={t('Slack')} data-test="slack-connection-card">
      {loading ? (
        <Loading position="inline-centered" />
      ) : (
        <CardBody>
          <div>
            <div className="slack-status-label">{t('Status')}</div>
            <div data-test="slack-status">
              {status.connected ? t('Connected') : t('Not Connected')}
            </div>
            {status.connected && status.integration && (
              <div className="slack-workspace">
                <div className="slack-status-label">{t('Workspace')}</div>
                <div data-test="slack-workspace-name">
                  {status.integration.workspace.name}
                </div>
              </div>
            )}
          </div>
          {status.connected ? (
            <Button
              buttonStyle="danger"
              loading={disconnecting}
              onClick={handleDisconnect}
              data-test="slack-disconnect-button"
            >
              {t('Disconnect')}
            </Button>
          ) : (
            <Button
              buttonStyle="primary"
              loading={connecting}
              onClick={handleConnect}
              data-test="slack-connect-button"
            >
              {t('Connect Slack')}
            </Button>
          )}
        </CardBody>
      )}
    </Card>
  );
}
