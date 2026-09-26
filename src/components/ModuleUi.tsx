import type { MouseEventHandler } from 'react';
import type { TableColumn } from '../types';
import ModulePage from './ModulePage';

type EmptyRecordsCardProps = {
  title: string;
  emptyMessage?: string;
};

export default function EmptyRecordsCard({
  title,
  emptyMessage = 'No records yet.',
}: EmptyRecordsCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      </header>
      <div className="px-5 py-10 text-sm text-center text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    </div>
  );
}

type AddButtonProps = {
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function AddButton({ label, onClick }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
    >
      {label}
    </button>
  );
}

type RecordsTableProps<T extends { id: string | number }> = {
  columns: TableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
};

export function RecordsTable<T extends { id: string | number }>({
  columns,
  rows,
  emptyMessage = 'No records found.',
}: RecordsTableProps<T>) {
  if (!rows.length) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl">
        <div className="px-5 py-10 text-sm text-center text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <div className="p-3 overflow-x-auto">
        <table className="table-auto w-full">
          <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="p-2 whitespace-nowrap">
                  <div className="font-semibold text-left">{column.label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key} className="p-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                    {column.render
                      ? column.render(row)
                      : String((row as unknown as Record<string, unknown>)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { ModulePage };
