import type { TableControls } from '../hooks/useTableControls';

type SortHeaderProps = {
  label: string;
  column: string;
  table: Pick<TableControls, 'sortKey' | 'sortDirection' | 'toggleSort'>;
  align?: 'left' | 'right';
};

export function SortHeader({ label, column, table, align = 'left' }: SortHeaderProps) {
  const active = table.sortKey === column;

  return (
    <button
      type="button"
      onClick={() => table.toggleSort(column)}
      title={`Sort by ${label}`}
      className={`group inline-flex items-center gap-1 font-semibold uppercase ${align === 'right' ? 'flex-row-reverse' : ''} ${
        active ? 'text-gray-700 dark:text-gray-200' : 'hover:text-gray-600 dark:hover:text-gray-300'
      }`}
    >
      <span>{label}</span>
      <svg
        className={`h-3 w-3 shrink-0 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden="true"
      >
        {active && table.sortDirection === 'desc'
          ? <path d="M6 9 2 4h8z" />
          : <path d="M6 3 2 8h8z" />}
      </svg>
    </button>
  );
}

type TablePaginationProps = {
  table: Pick<TableControls, 'page' | 'pageCount' | 'pageSize' | 'total' | 'offset' | 'setPage'>;
  className?: string;
};

function pageNumbers(page: number, pageCount: number): Array<number | 'gap'> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const result: Array<number | 'gap'> = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) {
      result.push('gap');
    }
    result.push(n);
  });

  return result;
}

export function TablePagination({ table, className = '' }: TablePaginationProps) {
  const { page, pageCount, total, offset, pageSize, setPage } = table;
  if (total === 0) {
    return null;
  }

  const from = offset + 1;
  const to = Math.min(offset + pageSize, total);
  const buttonClass = 'min-w-8 h-8 px-2 inline-flex items-center justify-center rounded-lg border text-sm';
  const idleClass = 'border-gray-200 dark:border-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40';

  return (
    <nav
      aria-label="Table pagination"
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 py-3 border-t border-gray-100 dark:border-gray-700/60 ${className}`}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium text-gray-700 dark:text-gray-200">{from}</span>–
        <span className="font-medium text-gray-700 dark:text-gray-200">{to}</span> of{' '}
        <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span>
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className={`${buttonClass} ${idleClass} disabled:opacity-40 disabled:pointer-events-none`}
          >
            Prev
          </button>
          {pageNumbers(page, pageCount).map((n, i) => (n === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-gray-400">…</span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`${buttonClass} ${
                n === page
                  ? 'border-violet-500 bg-violet-500 text-white'
                  : idleClass
              }`}
            >
              {n}
            </button>
          )))}
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page === pageCount}
            className={`${buttonClass} ${idleClass} disabled:opacity-40 disabled:pointer-events-none`}
          >
            Next
          </button>
        </div>
      )}
    </nav>
  );
}
