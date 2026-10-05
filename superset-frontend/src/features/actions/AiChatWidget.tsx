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
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import {
  Avatar,
  Button,
  Drawer,
  Input,
  SafeMarkdown,
  Tooltip,
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

// Below this viewport width the panel takes the full screen instead of a
// fixed side width - a 400px drawer on a 375px phone would overflow.
const MOBILE_BREAKPOINT = 480;

const SUGGESTED_PROMPTS = [
  t('How many hubs do we have?'),
  t('Show me open alerts'),
  t('Which vehicles are under maintenance?'),
  t('Summarize today’s incidents'),
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
  sources?: string[];
}

// A generic four-point "spark" glyph (a large sparkle plus a smaller one) -
// the same visual family used across most professional AI assistants
// (Gemini, Notion AI, Copilot-style products) to signal "AI" at a glance,
// distinct from Superset's own icon set (which has no purpose-built AI
// icon). Paths carry no `fill` of their own, so they inherit the `color`
// of whichever IconGlyph wrapper they're rendered inside - exactly like
// this project's own `Icons.*` set already relies on for recoloring.
function AiSparkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 2.4c.46 0 .86.32.96.77l1.06 4.77a3.9 3.9 0 0 0 2.94 2.94l4.77 1.06a.99.99 0 0 1 0 1.92l-4.77 1.06a3.9 3.9 0 0 0-2.94 2.94l-1.06 4.77a.99.99 0 0 1-1.92 0l-1.06-4.77a3.9 3.9 0 0 0-2.94-2.94l-4.77-1.06a.99.99 0 0 1 0-1.92l4.77-1.06a3.9 3.9 0 0 0 2.94-2.94l1.06-4.77c.1-.45.5-.77.96-.77Z"
        fill="currentColor"
      />
      <path
        d="M19.2 1.2c.35 0 .64.24.71.58l.32 1.45c.1.44.44.78.88.88l1.45.32a.73.73 0 0 1 0 1.42l-1.45.32a1.13 1.13 0 0 0-.88.88l-.32 1.45a.73.73 0 0 1-1.42 0l-.32-1.45a1.13 1.13 0 0 0-.88-.88l-1.45-.32a.73.73 0 0 1 0-1.42l1.45-.32c.44-.1.78-.44.88-.88l.32-1.45c.07-.34.36-.58.71-.58Z"
        fill="currentColor"
      />
    </svg>
  );
}

function useViewportWidth() {
  const [width, setWidth] = useState(
    () => (typeof window !== 'undefined' && window.innerWidth) || 1024,
  );
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
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
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease;

    /* A slow, low-opacity "breathing" ring behind the button - subtle
       enough to read as "alive" rather than a distracting attention-getter.
       Solid theme color + animated opacity/scale, not an animated color, so
       it never needs a hand-computed rgba() of the brand color. */
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: ${theme.colorPrimary};
      z-index: -1;
      animation: cc-launcher-pulse 2.6s ease-out infinite;
    }

    &:hover {
      transform: scale(1.06);
    }

    &:hover::before {
      animation-play-state: paused;
    }

    &:focus-visible {
      outline: 2px solid ${theme.colorPrimaryBorderHover};
      outline-offset: 2px;
    }

    @keyframes cc-launcher-pulse {
      0% {
        transform: scale(1);
        opacity: 0.55;
      }
      100% {
        transform: scale(1.6);
        opacity: 0;
      }
    }
  `}
`;

const StatusDot = styled.span<{ size?: number }>`
  ${({ theme, size = 8 }) => css`
    position: relative;
    display: inline-block;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: ${theme.colorSuccess};
    border: 2px solid ${theme.colorBgContainer};
    flex: 0 0 auto;

    /* Same technique as the launcher's pulse - a "live" indicator ring
       that expands and fades, built from opacity/transform only. */
    &::after {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      background: ${theme.colorSuccess};
      z-index: -1;
      animation: cc-status-ping 2s ease-out infinite;
    }

    @keyframes cc-status-ping {
      0% {
        transform: scale(1);
        opacity: 0.65;
      }
      100% {
        transform: scale(2.4);
        opacity: 0;
      }
    }
  `}
`;

const IconGlyph = styled.span<{
  spinning?: boolean;
  tone?: 'white' | 'primary';
}>`
  ${({ theme, spinning, tone = 'white' }) => css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${tone === 'white' ? theme.colorWhite : theme.colorPrimary};
    line-height: 0;

    ${spinning &&
    css`
      animation: cc-ai-spin 2.2s linear infinite;
    `}

    @keyframes cc-ai-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `}
`;

// Positioned relative to Launcher, its nearest positioned ancestor - not a
// separate wrapper, since Launcher's own `position: fixed` takes it out of
// normal flow and collapses any non-fixed wrapper around it to 0x0, which
// would anchor an absolutely-positioned sibling to the raw viewport corner
// instead of the button.
const LauncherStatusDot = styled(StatusDot)`
  position: absolute;
  right: 2px;
  bottom: 2px;
`;

const HeaderTitle = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: ${theme.sizeUnit * 2.5}px;
    min-width: 0;

    .ant-avatar {
      flex: 0 0 auto;
      background: ${theme.colorPrimary};
    }

    .header-text {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .header-name {
      font-size: ${theme.fontSize}px;
      font-weight: ${theme.fontWeightStrong};
      color: ${theme.colorText};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header-status {
      display: flex;
      align-items: center;
      gap: ${theme.sizeUnit}px;
      font-size: ${theme.fontSizeSM - 1}px;
      color: ${theme.colorTextSecondary};
    }
  `}
`;

const PanelBody = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ScopeBar = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${theme.sizeUnit * 2}px;
    padding: ${theme.sizeUnit * 1.5}px ${theme.sizeUnit * 4}px;
    border-bottom: 1px solid ${theme.colorBorderSecondary};
    background: ${theme.colorFillTertiary};
    font-size: ${theme.fontSizeSM - 1}px;
    color: ${theme.colorTextSecondary};

    .scope-label {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* A real bordered/text button here, not a bare link floating next to
       the label - buttonStyle="link" renders as plain colorLink (brand
       green) text with no button affordance of its own, which read as two
       unrelated, inconsistently-styled bits rather than one
       "you're scoped / leave scope" control. */
    .superset-button {
      flex: 0 0 auto;
    }
  `}
`;

const MessageList = styled.div`
  ${({ theme }) => css`
    flex: 1;
    overflow-y: auto;
    padding: ${theme.sizeUnit * 4}px;
    display: flex;
    flex-direction: column;
    gap: ${theme.sizeUnit * 4}px;
    background: ${theme.colorBgLayout};
  `}
`;

const MessageRow = styled.div<{ role: ChatMessage['role'] }>`
  ${({ theme, role }) => css`
    display: flex;
    align-items: flex-end;
    gap: ${theme.sizeUnit * 2}px;
    justify-content: ${role === 'user' ? 'flex-end' : 'flex-start'};

    .ant-avatar {
      flex: 0 0 auto;
      margin-bottom: 2px;
      background: ${role === 'error' ? theme.colorError : theme.colorPrimary};
    }
  `}
`;

const Bubble = styled.div<{ role: ChatMessage['role'] }>`
  ${({ theme, role }) => css`
    max-width: 84%;
    min-width: 0;
    padding: ${theme.sizeUnit * 2.5}px ${theme.sizeUnit * 3.5}px;
    border-radius: ${theme.borderRadiusLG}px;
    font-size: ${theme.fontSizeSM}px;
    line-height: 1.55;
    color: ${role === 'user'
      ? theme.colorWhite
      : role === 'error'
        ? theme.colorErrorText
        : theme.colorText};
    background: ${role === 'user'
      ? theme.colorPrimary
      : role === 'error'
        ? theme.colorErrorBg
        : theme.colorBgContainer};
    border: 1px solid
      ${role === 'user'
        ? 'transparent'
        : role === 'error'
          ? theme.colorErrorBorder
          : theme.colorBorderSecondary};
    ${role === 'user' &&
    css`
      border-bottom-right-radius: ${theme.borderRadiusSM}px;
      white-space: pre-wrap;
      word-wrap: break-word;
    `}
    ${role !== 'user' &&
    css`
      border-bottom-left-radius: ${theme.borderRadiusSM}px;
    `}

    /* Markdown content from SafeMarkdown - spacing, headings, code, tables,
       links, and lists all need explicit rules since react-markdown emits
       plain block elements with no styling of their own. */
    > *:first-of-type {
      margin-top: 0;
    }
    > *:last-child {
      margin-bottom: 0;
    }

    p {
      margin: 0 0 ${theme.sizeUnit * 2}px;
    }

    ul,
    ol {
      margin: 0 0 ${theme.sizeUnit * 2}px;
      padding-inline-start: ${theme.sizeUnit * 5}px;
    }

    li + li {
      margin-top: ${theme.sizeUnit}px;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      margin: ${theme.sizeUnit * 3}px 0 ${theme.sizeUnit * 1.5}px;
      font-weight: ${theme.fontWeightStrong};
      line-height: 1.3;
    }
    h1 {
      font-size: ${theme.fontSize + 2}px;
    }
    h2,
    h3 {
      font-size: ${theme.fontSize + 1}px;
    }
    h4,
    h5,
    h6 {
      font-size: ${theme.fontSizeSM}px;
    }

    strong {
      font-weight: ${theme.fontWeightStrong};
    }

    a {
      color: ${role === 'user' ? theme.colorWhite : theme.colorLink};
      text-decoration: underline;
      text-underline-offset: 2px;
      word-break: break-word;
    }

    blockquote {
      margin: ${theme.sizeUnit * 2}px 0;
      padding-left: ${theme.sizeUnit * 3}px;
      border-left: 2px solid
        ${role === 'user' ? 'rgba(255, 255, 255, 0.5)' : theme.colorBorder};
      color: ${role === 'user' ? theme.colorWhite : theme.colorTextSecondary};
    }

    code {
      font-family: ${theme.fontFamilyCode};
      font-size: ${theme.fontSizeSM - 1}px;
      background: ${role === 'user'
        ? 'rgba(255, 255, 255, 0.18)'
        : theme.colorFillTertiary};
      padding: 1px 5px;
      border-radius: ${theme.borderRadiusSM}px;
    }

    pre {
      margin: 0 0 ${theme.sizeUnit * 2}px;
      padding: ${theme.sizeUnit * 2.5}px;
      overflow-x: auto;
      background: ${role === 'user'
        ? 'rgba(255, 255, 255, 0.14)'
        : theme.colorFillTertiary};
      border-radius: ${theme.borderRadius}px;

      code {
        background: none;
        padding: 0;
      }
    }

    table {
      width: 100%;
      margin: 0 0 ${theme.sizeUnit * 2}px;
      border-collapse: collapse;
      font-size: ${theme.fontSizeSM - 1}px;
    }

    th,
    td {
      padding: ${theme.sizeUnit}px ${theme.sizeUnit * 1.5}px;
      border: 1px solid
        ${role === 'user' ? 'rgba(255, 255, 255, 0.3)' : theme.colorBorder};
      text-align: left;
    }

    th {
      font-weight: ${theme.fontWeightStrong};
      background: ${role === 'user'
        ? 'rgba(255, 255, 255, 0.12)'
        : theme.colorFillQuaternary};
    }

    hr {
      margin: ${theme.sizeUnit * 2}px 0;
      border: none;
      border-top: 1px solid
        ${role === 'user' ? 'rgba(255, 255, 255, 0.3)' : theme.colorBorder};
    }
  `}
`;

const SourcesLine = styled.div`
  ${({ theme }) => css`
    margin-top: ${theme.sizeUnit * 1.5}px;
    padding-top: ${theme.sizeUnit * 1.5}px;
    border-top: 1px solid ${theme.colorBorderSecondary};
    font-size: ${theme.fontSizeSM - 1}px;
    color: ${theme.colorTextTertiary};
  `}
`;

const TypingBubble = styled(Bubble)`
  display: inline-flex;
  align-items: center;
  padding-top: ${({ theme }) => theme.sizeUnit * 2.5}px;
  padding-bottom: ${({ theme }) => theme.sizeUnit * 2.5}px;
`;

const TypingDots = styled.div`
  ${({ theme }) => css`
    display: flex;
    gap: ${theme.sizeUnit}px;

    span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${theme.colorTextTertiary};
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

const EmptyStateWrap = styled.div`
  ${({ theme }) => css`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: ${theme.sizeUnit * 8}px ${theme.sizeUnit * 6}px;
    background: ${theme.colorBgLayout};

    .ant-avatar {
      background: ${theme.colorPrimary};
      margin-bottom: ${theme.sizeUnit * 4}px;
    }

    h4 {
      margin: 0 0 ${theme.sizeUnit}px;
      font-size: ${theme.fontSize + 1}px;
      font-weight: ${theme.fontWeightStrong};
      color: ${theme.colorText};
    }

    p {
      margin: 0 0 ${theme.sizeUnit * 5}px;
      font-size: ${theme.fontSizeSM}px;
      color: ${theme.colorTextSecondary};
      max-width: 280px;
    }
  `}
`;

const PromptGrid = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: ${theme.sizeUnit * 2}px;
    width: 100%;
    max-width: 300px;
  `}
`;

const PromptChip = styled.button`
  ${({ theme }) => css`
    width: 100%;
    text-align: left;
    padding: ${theme.sizeUnit * 2.5}px ${theme.sizeUnit * 3}px;
    border-radius: ${theme.borderRadius}px;
    border: 1px solid ${theme.colorBorder};
    background: ${theme.colorBgContainer};
    color: ${theme.colorText};
    font-size: ${theme.fontSizeSM}px;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      background 0.15s ease;

    &:hover {
      border-color: ${theme.colorPrimary};
      background: ${theme.colorPrimaryBg};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colorPrimaryBorderHover};
      outline-offset: 1px;
    }
  `}
`;

const Composer = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: flex-end;
    gap: ${theme.sizeUnit * 2}px;
    padding: ${theme.sizeUnit * 3}px ${theme.sizeUnit * 4}px;
    border-top: 1px solid ${theme.colorBorderSecondary};
    background: ${theme.colorBgContainer};

    .ant-input {
      border-radius: ${theme.borderRadiusLG}px;
      padding: ${theme.sizeUnit * 1.5}px ${theme.sizeUnit * 3}px;
      resize: none;
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
  const viewportWidth = useViewportWidth();
  const isMobile = viewportWidth < MOBILE_BREAKPOINT;

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

  // The launcher is always the general assistant, so its behaviour is
  // unchanged by chart chat; a chart conversation is only ever entered from
  // that chart's own action.
  const handleOpen = () => {
    setOpen(true);
    if (chartTarget) {
      setChartTarget(null);
      setMessages([]);
    }
  };

  const handleBackToGeneral = () => {
    setChartTarget(null);
    setInput('');
    setMessages([]);
  };

  const handleClear = () => {
    if (chartTarget) {
      chartConversationsRef.current.delete(chartTarget.chartId);
    } else {
      conversationIdRef.current = null;
      try {
        localStorage.removeItem(CONVERSATION_STORAGE_KEY);
      } catch {
        // Best-effort only, see the read above.
      }
    }
    setMessages([]);
    setInput('');
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
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

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const showEmptyState = !chartTarget && messages.length === 0 && !loading;
  const canClear = messages.length > 0;

  const headerTitle = (
    <HeaderTitle>
      <Avatar
        size={32}
        icon={
          <IconGlyph spinning={loading}>
            <AiSparkIcon size={16} />
          </IconGlyph>
        }
      />
      <div className="header-text">
        <div className="header-name">{t('Command Centre Assistant')}</div>
        <div className="header-status">
          <StatusDot size={7} />
          {t('Active')}
        </div>
      </div>
    </HeaderTitle>
  );

  return (
    <>
      <Launcher
        data-test="ai-chat-launcher"
        aria-label={t('Open Command Centre Assistant')}
        onClick={handleOpen}
      >
        <IconGlyph>
          <AiSparkIcon size={24} />
        </IconGlyph>
        <LauncherStatusDot size={12} />
      </Launcher>
      <Drawer
        title={headerTitle}
        extra={
          <Tooltip title={t('Clear conversation')}>
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<Icons.ClearOutlined iconSize="m" />}
              disabled={!canClear}
              onClick={handleClear}
              data-test="ai-chat-clear"
              aria-label={t('Clear conversation')}
            />
          </Tooltip>
        }
        placement="right"
        width={isMobile ? '100%' : 400}
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
                {t('Scoped to “%s” and its dataset', chartTarget.chartName)}
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
          {showEmptyState ? (
            <EmptyStateWrap data-test="ai-chat-empty-state">
              <Avatar
                size={48}
                icon={
                  <IconGlyph>
                    <AiSparkIcon size={22} />
                  </IconGlyph>
                }
              />
              <h4>{t('Command Centre Assistant')}</h4>
              <p>
                {t(
                  'Ask about hubs, fleet, routes, orders, packages, or alerts.',
                )}
              </p>
              <PromptGrid>
                {SUGGESTED_PROMPTS.map(prompt => (
                  <PromptChip
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                  >
                    {prompt}
                  </PromptChip>
                ))}
              </PromptGrid>
            </EmptyStateWrap>
          ) : (
            <MessageList>
              {messages.map(message => (
                <MessageRow key={message.id} role={message.role}>
                  {message.role !== 'user' && (
                    <Avatar
                      size={24}
                      icon={
                        message.role === 'error' ? (
                          <Icons.ExclamationCircleOutlined />
                        ) : (
                          <IconGlyph>
                            <AiSparkIcon size={13} />
                          </IconGlyph>
                        )
                      }
                    />
                  )}
                  <Bubble role={message.role}>
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
                </MessageRow>
              ))}
              {loading && (
                <MessageRow role="assistant" data-test="ai-chat-typing">
                  <Avatar
                    size={24}
                    icon={
                      <IconGlyph spinning>
                        <AiSparkIcon size={13} />
                      </IconGlyph>
                    }
                  />
                  <TypingBubble role="assistant">
                    <TypingDots>
                      <span />
                      <span />
                      <span />
                    </TypingDots>
                  </TypingBubble>
                </MessageRow>
              )}
              <div ref={listEndRef} />
            </MessageList>
          )}
          <Composer>
            <Input.TextArea
              data-test="ai-chat-input"
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoSize={{ minRows: 1, maxRows: 4 }}
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
              onClick={() => handleSend()}
            />
          </Composer>
        </PanelBody>
      </Drawer>
    </>
  );
}
