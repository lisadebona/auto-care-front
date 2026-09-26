import type { ReactNode } from 'react';
import DashboardLayout from './DashboardLayout';

type ModulePageProps = {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
};

export default function ModulePage({ title, description, children, action }: ModulePageProps) {
  return (
    <DashboardLayout>
      <div className="sm:flex sm:justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">{title}</h1>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </DashboardLayout>
  );
}
