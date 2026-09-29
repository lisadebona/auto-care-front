import { useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export type SortValue = string | number | boolean | null | undefined;

export type SortAccessors<T> = Record<string, (row: T) => SortValue>;

type TableControlsOptions = {
  pageSize?: number;
  initialSort?: { key: string; direction?: SortDirection };
};

export const DEFAULT_PAGE_SIZE = 20;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function isEmpty(value: SortValue): value is null | undefined | '' {
  return value === null || value === undefined || value === '';
}

function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }

  return collator.compare(String(a), String(b));
}

export function useTableControls<T>(
  rows: T[],
  accessors: SortAccessors<T>,
  { pageSize = DEFAULT_PAGE_SIZE, initialSort }: TableControlsOptions = {},
) {
  const [sortKey, setSortKey] = useState<string | null>(initialSort?.key ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSort?.direction ?? 'asc');
  const [requestedPage, setPage] = useState(1);

  const accessor = sortKey ? accessors[sortKey] : undefined;
  const direction = sortDirection === 'asc' ? 1 : -1;
  const sortedRows = accessor
    ? [...rows].sort((rowA, rowB) => {
      const a = accessor(rowA);
      const b = accessor(rowB);

      // Empty values always sink to the bottom, regardless of direction.
      if (isEmpty(a) || isEmpty(b)) {
        return Number(isEmpty(a)) - Number(isEmpty(b));
      }

      return compareValues(a, b) * direction;
    })
    : rows;

  const total = sortedRows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const offset = (page - 1) * pageSize;
  const pageRows = sortedRows.slice(offset, offset + pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  return {
    pageRows,
    total,
    page,
    pageCount,
    pageSize,
    offset,
    setPage,
    sortKey,
    sortDirection,
    toggleSort,
  };
}

export type TableControls = ReturnType<typeof useTableControls>;
