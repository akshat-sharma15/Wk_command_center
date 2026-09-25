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
import { useEffect, useRef, useState, ChangeEvent } from 'react';
import { t } from '@apache-superset/core/translation';
import { css, styled } from '@apache-superset/core/theme';
import { Button, Drawer, Input } from '@superset-ui/core/components';
import { Icons } from '@superset-ui/core/components/Icons';
import { sendAiChatMessage } from './data/aiChat';

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

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      conversationIdRef.current = localStorage.getItem(CONVERSATION_STORAGE_KEY);
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

  const handleOpen = () => {
    setOpen(true);
    if (messages.length === 0) {
      setMessages([
        {
          id: 'greeting',
          role: 'assistant',
          text: t(
            'Hi! Ask me about hubs, fleet, routes, orders, packages, or alerts.',
          ),
        },
      ]);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text },
    ]);
    setInput('');
    setLoading(true);

    try {
      const result = await sendAiChatMessage(text, conversationIdRef.current);
      conversationIdRef.current = result.conversation_id;
      try {
        localStorage.setItem(CONVERSATION_STORAGE_KEY, result.conversation_id);
      } catch {
        // Best-effort only, see the read above.
      }
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: result.answer,
          sources: result.sources,
        },
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'error',
          text: (error as Error).message,
        },
      ]);
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
        title={t('Command Centre Assistant')}
        placement="right"
        width={380}
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose={false}
        styles={{ body: { padding: 0 } }}
        data-test="ai-chat-drawer"
      >
        <PanelBody>
          <MessageList>
            {messages.map(message => (
              <Bubble key={message.id} role={message.role}>
                {message.text}
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
              placeholder={t('Ask about hubs, fleet, orders…')}
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
