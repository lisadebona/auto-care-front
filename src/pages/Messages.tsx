import { useEffect, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import ModulePage from '../components/ModulePage';
import apiClient from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import type { EmailMessage, ValidationErrors } from '../types';

type MessageForm = {
  to_email: string;
  to_name: string;
  subject: string;
  body: string;
};

const emptyForm = (): MessageForm => ({
  to_email: '',
  to_name: '',
  subject: '',
  body: '',
});

function personLabel(name?: string | null, email?: string | null): string {
  if (name && email) {
    return `${name} <${email}>`;
  }

  return name || email || 'Unknown';
}

function formatWhen(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
}

export default function Messages() {
  const { hasPermission } = usePermission();
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<EmailMessage | null>(null);
  const [opening, setOpening] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState<MessageForm>(emptyForm());
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loadMessages = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await apiClient.get<{ messages: EmailMessage[] }>('/api/messages', {
            params: search ? { search } : {},
          });
          setMessages(response.data.messages);
        } catch (err: unknown) {
          if (isAxiosError(err)) {
            const message = err.response?.data?.message;
            setError(typeof message === 'string' ? message : 'Unable to load messages.');
          } else {
            setError('Unable to load messages.');
          }
        } finally {
          setLoading(false);
        }
      };

      void loadMessages();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search, refreshKey]);

  const openMessage = async (message: EmailMessage) => {
    setOpening(true);
    setError('');
    try {
      const response = await apiClient.get<{ message: EmailMessage }>(`/api/messages/${message.id}`);
      setSelected(response.data.message);
      setMessages((current) => current.map((item) => (
        item.id === message.id ? { ...item, is_read: true } : item
      )));
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const responseMessage = err.response?.data?.message;
        setError(typeof responseMessage === 'string' ? responseMessage : 'Unable to open this message.');
      } else {
        setError('Unable to open this message.');
      }
    } finally {
      setOpening(false);
    }
  };

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setNotice('');
    setSending(true);

    try {
      const response = await apiClient.post<{ message: string; email: EmailMessage }>('/api/messages', form);
      setNotice(response.data.message);
      setSelected(response.data.email);
      setComposeOpen(false);
      setForm(emptyForm());
      setRefreshKey((current) => current + 1);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const errors = (err.response?.data as { errors?: ValidationErrors } | undefined)?.errors;
        if (errors) {
          setFieldErrors(errors);
        } else {
          const message = err.response?.data?.message;
          setFieldErrors({
            form: [typeof message === 'string' ? message : 'Unable to send this message.'],
          });
        }
      } else {
        setFieldErrors({ form: ['Unable to send this message.'] });
      }
    } finally {
      setSending(false);
    }
  };

  const latestSync = messages.reduce<string | null>((latest, message) => {
    if (!message.synced_at) {
      return latest;
    }

    if (!latest || message.synced_at > latest) {
      return message.synced_at;
    }

    return latest;
  }, null);

  return (
    <ModulePage
      title="Messages"
      description="Email synced from Mailgun by the Ubuntu mail handler."
      action={hasPermission('messages.create') ? (
        <button
          type="button"
          onClick={() => {
            setFieldErrors({});
            setComposeOpen(true);
          }}
          className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
        >
          New Message
        </button>
      ) : undefined}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          className="form-input w-full max-w-md"
          placeholder="Search by subject, sender, or recipient..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {latestSync ? `Last synced ${formatWhen(latestSync)}` : 'Waiting for the Mailgun container to sync'}
        </p>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>}
      {notice && <div className="mb-4 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm px-3 py-2">{notice}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[22rem_minmax(0,1fr)] gap-4">
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Inbox</h2>
          </div>
          {loading ? (
            <p className="px-5 py-8 text-sm text-gray-500">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-500">No messages yet. Start the Mailgun container, then send mail through Mailgun.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700/60 max-h-[40rem] overflow-y-auto">
              {messages.map((message) => {
                const active = selected?.id === message.id;
                return (
                  <li key={message.id}>
                    <button
                      type="button"
                      onClick={() => { void openMessage(message); }}
                      className={`w-full text-left px-5 py-3 transition ${
                        active
                          ? 'bg-violet-500/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`truncate text-sm ${message.is_read ? 'text-gray-700 dark:text-gray-200' : 'font-semibold text-gray-900 dark:text-white'}`}>
                          {personLabel(message.from_name, message.from_email)}
                        </span>
                        {!message.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" aria-label="Unread" />}
                      </div>
                      <p className={`mt-1 truncate text-sm ${message.is_read ? 'text-gray-600 dark:text-gray-300' : 'font-medium text-gray-800 dark:text-gray-100'}`}>
                        {message.subject || '(no subject)'}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">{formatWhen(message.sent_at)}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl border border-gray-200 dark:border-gray-700/60 min-h-80">
          {opening ? (
            <p className="px-5 py-8 text-sm text-gray-500">Opening message...</p>
          ) : selected ? (
            <div className="flex flex-col h-full">
              <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{selected.subject || '(no subject)'}</h2>
                <dl className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <div><dt className="inline text-gray-400">From </dt><dd className="inline">{personLabel(selected.from_name, selected.from_email)}</dd></div>
                  <div><dt className="inline text-gray-400">To </dt><dd className="inline">{personLabel(selected.to_name, selected.to_email)}</dd></div>
                  <div><dt className="inline text-gray-400">Sent </dt><dd className="inline">{formatWhen(selected.sent_at)}</dd></div>
                </dl>
              </header>
              <div className="px-5 py-4">
                {selected.delivery_note && (
                  <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">{selected.delivery_note}</p>
                )}
                {selected.html_body ? (
                  <iframe
                    title={selected.subject || 'Message'}
                    sandbox=""
                    srcDoc={selected.html_body}
                    className="w-full min-h-80 rounded-lg bg-white"
                  />
                ) : selected.text_body ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-200">{selected.text_body}</pre>
                ) : (
                  <p className="text-sm text-gray-500">This message has no body.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="px-5 py-8 text-sm text-gray-500">Select a message to read it.</p>
          )}
        </div>
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">New Message</h3>
              <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setComposeOpen(false)}>×</button>
            </div>
            <form onSubmit={(event) => { void handleSend(event); }} className="px-5 py-4 space-y-4">
              {fieldErrors.form && <p className="text-sm text-red-500">{fieldErrors.form[0]}</p>}
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="message-to">To</label>
                <input
                  id="message-to"
                  type="email"
                  required
                  className="form-input w-full"
                  value={form.to_email}
                  onChange={(event) => setForm((current) => ({ ...current, to_email: event.target.value }))}
                />
                {fieldErrors.to_email && <p className="mt-1 text-xs text-red-500">{fieldErrors.to_email[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="message-name">Recipient name</label>
                <input
                  id="message-name"
                  type="text"
                  className="form-input w-full"
                  value={form.to_name}
                  onChange={(event) => setForm((current) => ({ ...current, to_name: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="message-subject">Subject</label>
                <input
                  id="message-subject"
                  type="text"
                  required
                  className="form-input w-full"
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                />
                {fieldErrors.subject && <p className="mt-1 text-xs text-red-500">{fieldErrors.subject[0]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="message-body">Message</label>
                <textarea
                  id="message-body"
                  required
                  className="form-textarea w-full min-h-32"
                  value={form.body}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                />
                {fieldErrors.body && <p className="mt-1 text-xs text-red-500">{fieldErrors.body[0]}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn border border-gray-200 dark:border-gray-700" onClick={() => setComposeOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={sending} className="btn bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60">
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModulePage>
  );
}
