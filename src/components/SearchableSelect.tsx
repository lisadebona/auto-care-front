import { useEffect, useId, useRef, useState } from 'react';

export type SearchableSelectOption = {
  value: string;
  label: string;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5 13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SearchableSelect({
  id,
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel = 'Nothing to show.',
  disabled = false,
  createLabel,
  onChange,
  onCreate,
}: {
  id: string;
  value: string;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel?: string;
  disabled?: boolean;
  createLabel?: string;
  onChange: (value: string) => void;
  onCreate?: () => void;
}) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery === ''
    ? options
    : options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery('');
    setActiveIndex(0);
    searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const active = filtered[activeIndex];
    if (!active) {
      return;
    }

    document.getElementById(`${listId}-${active.value}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, query, listId]);

  const close = () => setOpen(false);

  const selectOption = (optionValue: string) => {
    onChange(optionValue);
    close();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        className="form-select flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`min-w-0 truncate ${selected ? '' : 'text-gray-400 dark:text-gray-500'}`}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          viewBox="0 0 16 16"
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          aria-hidden="true"
        >
          <path d="M4 6.5 8 10.5 12 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 border-b border-gray-200 px-3 text-gray-400 dark:border-gray-700">
            <SearchIcon />
            <input
              ref={searchRef}
              type="search"
              className="w-full border-0 bg-transparent py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:ring-0 dark:text-gray-100 dark:placeholder-gray-500"
              placeholder={searchPlaceholder}
              value={query}
              autoComplete="off"
              aria-label={searchPlaceholder}
              aria-controls={listId}
              aria-activedescendant={filtered[activeIndex] ? `${listId}-${filtered[activeIndex].value}` : undefined}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  close();
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveIndex((index) => Math.max(0, index - 1));
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const match = filtered[activeIndex];
                  if (match) {
                    selectOption(match.value);
                  }
                }
              }}
            />
          </div>

          {createLabel && onCreate && (
            <button
              type="button"
              className="block w-full border-b border-gray-100 px-3 py-2.5 text-left text-sm font-medium text-violet-600 hover:bg-violet-50 dark:border-gray-700/60 dark:text-violet-400 dark:hover:bg-violet-500/10"
              onClick={() => {
                close();
                onCreate();
              }}
            >
              {createLabel}
            </button>
          )}

          <ul id={listId} role="listbox" className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-gray-500">
                {query.trim() ? 'No matches.' : emptyLabel}
              </li>
            ) : filtered.map((option, index) => {
              const selectedOption = option.value === value;
              const active = index === activeIndex;

              return (
                <li key={option.value} role="presentation">
                  <button
                    id={`${listId}-${option.value}`}
                    type="button"
                    role="option"
                    aria-selected={selectedOption}
                    className={`block w-full truncate px-3 py-2.5 text-left text-sm ${
                      active || selectedOption
                        ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300'
                        : 'text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-700/40'
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectOption(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
