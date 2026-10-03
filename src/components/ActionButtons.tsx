import type { MouseEventHandler } from 'react';

type ActionButtonProps = {
  onClick: MouseEventHandler<HTMLButtonElement>;
  label?: string;
};

const baseClass = 'inline-flex items-center justify-center rounded-lg p-1.5 transition-colors';

export function EditButton({ onClick, label = 'Edit' }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`${baseClass} text-violet-500 hover:text-violet-600 hover:bg-violet-500/10`}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16.86 4.49a2.1 2.1 0 0 1 2.97 2.97L8.5 18.79 4.5 19.5l.71-4z" />
        <path d="m15 6 3 3" />
      </svg>
    </button>
  );
}

export function DeleteButton({ onClick, label = 'Delete' }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`${baseClass} text-red-500 hover:text-red-600 hover:bg-red-500/10`}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
        <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
      </svg>
    </button>
  );
}
