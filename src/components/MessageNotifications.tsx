import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import type { EmailMessage } from '../types';

export const messagesChangedEvent = 'autocare:messages-changed';

export function notifyMessagesChanged(): void {
  window.dispatchEvent(new Event(messagesChangedEvent));
}

const previewLimit = 8;
const refreshIntervalMs = 20000;

function personLabel(name?: string | null, email?: string | null): string {
  if (name && email) {
    return `${name} <${email}>`;
  }

  return name || email || 'Unknown';
}

function formatWhen(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString();
}

export default function MessageNotifications() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canView = hasPermission('messages.view');
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<EmailMessage[]>([]);

  useEffect(() => {
    if (!canView) {
      return;
    }

    let cancelled = false;

    const loadUnread = async () => {
      try {
        const response = await apiClient.get<{ messages: EmailMessage[] }>('/api/messages', {
          params: { unread: 1 },
        });
        if (!cancelled) {
          setMessages(response.data.messages);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
        }
      }
    };

    void loadUnread();
    const interval = window.setInterval(() => {
      void loadUnread();
    }, refreshIntervalMs);
    const refresh = () => {
      void loadUnread();
    };
    window.addEventListener(messagesChangedEvent, refresh);
    window.addEventListener('focus', refresh);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener(messagesChangedEvent, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [canView]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  if (!canView) {
    return null;
  }

  const unreadCount = messages.length;
  const preview = messages.slice(0, previewLimit);
  const badge = unreadCount > 9 ? '9+' : String(unreadCount);
  const label = unreadCount === 0
    ? 'No unread messages'
    : `${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="relative flex items-center justify-center cursor-pointer w-8 h-8 hover:bg-gray-100 lg:hover:bg-gray-200 dark:hover:bg-gray-700/50 dark:lg:hover:bg-gray-800 rounded-full"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <svg className="fill-current text-gray-500/80 dark:text-gray-400/80" width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M1.5 3A1.5 1.5 0 0 1 3 1.5h10A1.5 1.5 0 0 1 14.5 3v7A1.5 1.5 0 0 1 13 11.5H9.2L5.4 14.4A.8.8 0 0 1 4.1 13.8V11.5H3A1.5 1.5 0 0 1 1.5 10V3Zm1.7.3 4.8 3.2 4.8-3.2a.75.75 0 1 0-.84-1.24L8 5.02 3.04 2.06a.75.75 0 1 0-.84 1.24Z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-semibold leading-none text-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Unread messages"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-lg dark:border-gray-700/60 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700/60">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Messages</p>
            <p className="text-xs text-gray-500">{unreadCount === 0 ? 'All caught up' : `${unreadCount} unread`}</p>
          </div>

          {preview.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500">No unread messages.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700/60">
              {preview.map((message) => (
                <li key={message.id}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900/30"
                    onClick={() => {
                      setOpen(false);
                      navigate(`/messages?message=${message.uuid}`);
                    }}
                  >
                    <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {personLabel(message.from_name, message.from_email)}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-gray-700 dark:text-gray-200">
                      {message.subject || '(no subject)'}
                    </span>
                    {message.sent_at && (
                      <span className="mt-1 block text-xs text-gray-400">{formatWhen(message.sent_at)}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {unreadCount > preview.length && (
            <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-700/60">
              {unreadCount - preview.length} more unread
            </p>
          )}

          <div className="border-t border-gray-100 px-4 py-2.5 dark:border-gray-700/60">
            <Link
              to="/messages"
              className="text-sm font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
              onClick={() => setOpen(false)}
            >
              View inbox
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
