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
import { useCallback, useEffect, useRef, useState, ChangeEvent } from 'react';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import {
  Button,
  Drawer,
  Input,
  SafeMarkdown,
} from '@superset-ui/core/components';
import { Icons } from '@superset-ui/core/components/Icons';
import { sendAiChatMessage } from './data/aiChat';
import { sendChartChatMessage } from './data/chartChat';
import { subscribeToChartChat, type ChartChatTarget } from './chartChatBus';

// Mounted once, globally, in views/App.tsx - outside the routed <Switch> -
// so it persists (and keeps its conversation) across page navigation
// instead of remounting per-page, and never sits inside a dashboard's own
// chart layout where it could be clipped or interfere with chart sizing.
const CONVERSATION_STORAGE_KEY = 'cc_ai_conversation_id';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
  sources?: string[];
}

const Launcher = styled.button`
  ${({ theme }) => css`
    position: fixed;
    right: ${theme.sizeUnit * 6}px;
    bottom: ${theme.sizeUnit * 6}px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${theme.colorPrimary};
    box-shadow: ${theme.boxShadowSecondary};
    z-index: ${theme.zIndexPopupBase};
    transition: transform 0.15s ease;

    &:hover {
      transform: scale(1.06);
    }

    svg {
      fill: ${theme.colorWhite};
      width: 24px;
      height: 24px;
    }
  `}
`;

const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const MessageList = styled.div`
  ${({ theme }) => css`
    flex: 1;
    overflow-y: auto;
    padding: ${theme.sizeUnit * 3}px;
    display: flex;
    flex-direction: column;
    gap: ${theme.sizeUnit * 2}px;
    background: ${theme.colorBgLayout};
  `}
`;

const Bubble = styled.div<{ role: ChatMessage['role'] }>`
  ${({ theme, role }) => css`
    max-width: 86%;
    padding: ${theme.sizeUnit * 2}px ${theme.sizeUnit * 3}px;
    border-radius: ${theme.borderRadius * 2}px;
    font-size: ${theme.fontSizeSM}px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-wrap: break-word;
    align-self: ${role === 'user' ? 'flex-end' : 'flex-start'};
    background: ${role === 'user'
      ? theme.colorPrimary
      : role === 'error'
        ? theme.colorErrorBg
        : theme.colorBgContainer};
    color: ${role === 'user'
      ? theme.colorWhite
      : role === 'error'
        ? theme.colorErrorText
        : theme.colorText};
    border: ${role === 'assistant' ? `1px solid ${theme.colorBorder}` : 'none'};

    p,
    ul,
    ol {
      margin: 0;

      & + p,
      & + ul,
      & + ol {
        margin-top: ${theme.sizeUnit * 2}px;
      }
    }

    ul,
    ol {
      padding-inline-start: ${theme.sizeUnit * 5}px;
    }
  `}
`;

const SourcesLine = styled.div`
  ${({ theme }) => css`
    margin-top: ${theme.sizeUnit}px;
    font-size: ${theme.fontSizeSM - 1}px;
    opacity: 0.7;
  `}
`;

const TypingDots = styled.div`
  ${({ theme }) => css`
    display: flex;
    gap: ${theme.sizeUnit}px;
    padding: ${theme.sizeUnit * 2}px ${theme.sizeUnit * 3}px;

    span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${theme.colorTextSecondary};
      animation: cc-ai-bounce 1.2s infinite ease-in-out;

      &:nth-child(2) {
        animation-delay: 0.15s;
      }

      &:nth-child(3) {
        animation-delay: 0.3s;
      }
    }

    @keyframes cc-ai-bounce {
      0%,
      60%,
      100% {
        transform: translateY(0);
        opacity: 0.4;
      }
      30% {
        transform: translateY(-4px);
        opacity: 1;
      }
    }
  `}
`;

const InputRow = styled.div`
  ${({ theme }) => css`
    display: flex;
    gap: ${theme.sizeUnit * 2}px;
    padding: ${theme.sizeUnit * 3}px;
    border-top: 1px solid ${theme.colorBorder};
    background: ${theme.colorBgContainer};
  `}
`;

const ScopeBar = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${theme.sizeUnit * 2}px;
    padding: ${theme.sizeUnit * 2}px ${theme.sizeUnit * 3}px;
    border-bottom: 1px solid ${theme.colorBorder};
    background: ${theme.colorBgContainer};
    font-size: ${theme.fontSizeSM}px;

    .scope-label {
      flex: 1 1 auto;
      min-width: 0;
      padding: ${theme.sizeUnit}px ${theme.sizeUnit * 2}px;
      border-radius: ${theme.borderRadius}px;
      background: ${theme.colorPrimaryBg};
      color: ${theme.colorPrimaryText};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* The exit-scope button is a real bordered action here, not a bare
       link floating next to the scope chip - buttonStyle="link" renders
       as plain colorLink (brand green) text with no button affordance of
       its own, which read as two unrelated, inconsistently-styled bits
       rather than one "you're scoped / leave scope" control. */
    .superset-button {
      flex: 0 0 auto;
    }
  `}
`;

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // null = the general assistant; set = scoped to one chart's dataset.
  const [chartTarget, setChartTarget] = useState<ChartChatTarget | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  // Per-chart conversations are kept separately from the global one (and from
  // each other) so a chart's context can't bleed into another thread. Held in
  // memory only: chart chats are opened from a chart, not resumed on reload.
  const chartConversationsRef = useRef<Map<number, string>>(new Map());
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      conversationIdRef.current = localStorage.getItem(
        CONVERSATION_STORAGE_KEY,
      );
    } catch {
      // Per-viewer convenience only - a blocked/unavailable localStorage
      // just means conversation continuity across reloads is lost, not a
      // functional break.
      conversationIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Opens the panel scoped to one chart and immediately asks for that chart's
  // summary, so the user gets an overview without having to ask for one.
  const openForChart = useCallback(
    async (target: ChartChatTarget) => {
      setChartTarget(target);
      setInput('');
      setOpen(true);
      setMessages([
        {
          id: `chart-${target.chartId}-${Date.now()}`,
          role: 'assistant',
          text: t('Summarising **%s**…', target.chartName),
        },
      ]);
      setLoading(true);

      try {
        const result = await sendChartChatMessage(
          target.chartId,
          null,
          chartConversationsRef.current.get(target.chartId) ?? null,
        );
        chartConversationsRef.current.set(
          target.chartId,
          result.conversation_id,
        );
        appendMessage({
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: result.answer,
          sources: result.sources,
        });
      } catch (error) {
        appendMessage({
          id: `e-${Date.now()}`,
          role: 'error',
          text: (error as Error).message,
        });
      } finally {
        setLoading(false);
      }
    },
    [appendMessage],
  );

  useEffect(
    () =>
      subscribeToChartChat(target => {
        openForChart(target);
      }),
    [openForChart],
  );

  const greeting: ChatMessage = {
    id: 'greeting',
    role: 'assistant',
    text: t(
      'Hi! Ask me about hubs, fleet, routes, orders, packages, or alerts.',
    ),
  };

  // The launcher is always the general assistant, so its behaviour is
  // unchanged by chart chat; a chart conversation is only ever entered from
  // that chart's own action.
  const handleOpen = () => {
    setOpen(true);
    if (chartTarget) {
      setChartTarget(null);
      setMessages([greeting]);
      return;
    }
    if (messages.length === 0) {
      setMessages([greeting]);
    }
  };

  const handleBackToGeneral = () => {
    setChartTarget(null);
    setInput('');
    setMessages([greeting]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    appendMessage({ id: `u-${Date.now()}`, role: 'user', text });
    setInput('');
    setLoading(true);

    try {
      const scopedChart = chartTarget;
      const result = scopedChart
        ? await sendChartChatMessage(
            scopedChart.chartId,
            text,
            chartConversationsRef.current.get(scopedChart.chartId) ?? null,
          )
        : await sendAiChatMessage(text, conversationIdRef.current);

      if (scopedChart) {
        chartConversationsRef.current.set(
          scopedChart.chartId,
          result.conversation_id,
        );
      } else {
        conversationIdRef.current = result.conversation_id;
        try {
          localStorage.setItem(
            CONVERSATION_STORAGE_KEY,
            result.conversation_id,
          );
        } catch {
          // Best-effort only, see the read above.
        }
      }

      appendMessage({
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: result.answer,
        sources: result.sources,
      });
    } catch (error) {
      appendMessage({
        id: `e-${Date.now()}`,
        role: 'error',
        text: (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  return (
    <>
      <Launcher
        data-test="ai-chat-launcher"
        aria-label={t('Open Command Centre Assistant')}
        onClick={handleOpen}
      >
        <Icons.CommentOutlined />
      </Launcher>
      <Drawer
        title={
          chartTarget
            ? t('Assistant: %s', chartTarget.chartName)
            : t('Command Centre Assistant')
        }
        placement="right"
        width={380}
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose={false}
        styles={{ body: { padding: 0 } }}
        data-test="ai-chat-drawer"
      >
        <PanelBody>
          {chartTarget && (
            <ScopeBar data-test="ai-chat-scope-bar">
              <span className="scope-label">
                {t('Scoped to this chart and its dataset')}
              </span>
              <Button
                buttonSize="xsmall"
                buttonStyle="secondary"
                onClick={handleBackToGeneral}
                data-test="ai-chat-exit-chart-scope"
              >
                {t('Ask about everything')}
              </Button>
            </ScopeBar>
          )}
          <MessageList>
            {messages.map(message => (
              <Bubble key={message.id} role={message.role}>
                {message.role === 'user' ? (
                  message.text
                ) : (
                  <SafeMarkdown source={message.text} />
                )}
                {message.sources && message.sources.length > 0 && (
                  <SourcesLine>
                    {t('Source: %s', message.sources.join(', '))}
                  </SourcesLine>
                )}
              </Bubble>
            ))}
            {loading && (
              <TypingDots>
                <span />
                <span />
                <span />
              </TypingDots>
            )}
            <div ref={listEndRef} />
          </MessageList>
          <InputRow>
            <Input
              data-test="ai-chat-input"
              value={input}
              onChange={handleInputChange}
              onPressEnter={handleSend}
              disabled={loading}
              placeholder={
                chartTarget
                  ? t('Ask about this chart…')
                  : t('Ask about hubs, fleet, orders…')
              }
            />
            <Button
              data-test="ai-chat-send"
              type="primary"
              shape="circle"
              icon={<Icons.ArrowRightOutlined />}
              loading={loading}
              disabled={!input.trim()}
              onClick={handleSend}
            />
          </InputRow>
        </PanelBody>
      </Drawer>
    </>
  );
}
