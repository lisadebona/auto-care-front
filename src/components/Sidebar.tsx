import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Logo from './Logo';
import { navGroups } from '../config/nav';
import type { NavIcon } from '../types';

const icons: Record<NavIcon, ReactNode> = {
  dashboard: (
    <svg className="shrink-0 fill-current text-violet-500" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <path d="M5.936.278A7.983 7.983 0 0 1 8 0a8 8 0 1 1-8 8c0-.722.104-1.413.278-2.064a1 1 0 1 1 1.932.516A5.99 5.99 0 0 0 2 8a6 6 0 1 0 6-6c-.53 0-1.045.076-1.548.21A1 1 0 1 1 5.936.278Z" />
      <path d="M6.068 7.482A2.003 2.003 0 0 0 8 10a2 2 0 1 0-.518-3.932L3.707 2.293a1 1 0 0 0-1.414 1.414l3.775 3.775Z" />
    </svg>
  ),
  inventory: (
    <svg className="shrink-0 fill-current text-violet-500" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h9A1.5 1.5 0 0 1 14 2.5v2A1.5 1.5 0 0 1 12.5 6h-9A1.5 1.5 0 0 1 2 4.5v-2ZM3.5 7h9A1.5 1.5 0 0 1 14 8.5v2A1.5 1.5 0 0 1 12.5 12h-9A1.5 1.5 0 0 1 2 10.5v-2A1.5 1.5 0 0 1 3.5 7Zm0 6h9a1.5 1.5 0 0 1 0 3h-9a1.5 1.5 0 0 1 0-3Z" />
    </svg>
  ),
  people: (
    <svg className="shrink-0 fill-current text-violet-500" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
    </svg>
  ),
  settings: (
    <svg className="shrink-0 fill-current text-violet-500" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <path d="M6.5 1.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5V3h1.5A1.5 1.5 0 0 1 12.5 4.5V6H14a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-1.5v1.5A1.5 1.5 0 0 1 11 12H9.5v1.5a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5V12H5A1.5 1.5 0 0 1 3.5 10.5V9H2a.5.5 0 0 1-.5-.5v-2A.5.5 0 0 1 2 6h1.5V4.5A1.5 1.5 0 0 1 5 3h1.5V1.5ZM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
    </svg>
  ),
};

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const sidebar = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  const initiallyOpen = useMemo(() => {
    const open: Record<string, boolean> = {};
    navGroups.forEach((item) => {
      if (item.type === 'group') {
        open[item.title] = item.items.some((sub) => location.pathname.startsWith(sub.to));
      }
    });
    return open;
  }, [location.pathname]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initiallyOpen);

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      navGroups.forEach((item) => {
        if (item.type === 'group' && item.items.some((sub) => location.pathname.startsWith(sub.to))) {
          next[item.title] = true;
        }
      });
      return next;
    });
  }, [location.pathname]);

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (!(target instanceof Node)) return;
      if (!sidebarOpen || sidebar.current.contains(target) || trigger.current.contains(target)) return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 transition ${
      isActive
        ? 'bg-linear-to-r from-violet-500/12 dark:from-violet-500/24 to-violet-500/4 text-gray-800 dark:text-gray-100'
        : 'text-gray-800 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white'
    }`;

  const subLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center pl-4 pr-3 py-2 rounded-lg text-sm transition ${
      isActive
        ? 'text-violet-600 dark:text-violet-400 font-medium'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
    }`;

  const toggleGroup = (title: string) => {
    setOpenGroups((current) => ({ ...current, [title]: !current[title] }));
  };

  return (
    <div className="min-w-fit">
      <div
        className={`fixed inset-0 bg-gray-900/30 z-40 lg:hidden transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      <div
        id="sidebar"
        ref={sidebar}
        className={`flex lg:flex! flex-col absolute z-40 left-0 top-0 lg:static lg:translate-x-0 h-dvh overflow-y-auto no-scrollbar w-64 shrink-0 bg-white dark:bg-gray-800 p-4 transition-all duration-200 ease-in-out rounded-r-2xl shadow-xs ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-64'
        }`}
      >
        <div className="flex justify-between mb-10 pr-3 sm:px-2">
          <button
            ref={trigger}
            type="button"
            className="lg:hidden text-gray-500 hover:text-gray-400"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" />
            </svg>
          </button>
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <Logo />
            <span className="text-lg font-bold text-gray-800 dark:text-gray-100">Auto Care</span>
          </NavLink>
        </div>

        <div>
          <h3 className="text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold pl-3">Platform</h3>
          <ul className="mt-3">
            {navGroups.map((item) => {
              if (item.type === 'link') {
                return (
                  <li key={item.title}>
                    <NavLink to={item.to} className={linkClass} onClick={() => setSidebarOpen(false)}>
                      {icons[item.icon]}
                      <span className="text-sm font-medium ml-4">{item.title}</span>
                    </NavLink>
                  </li>
                );
              }

              const isOpen = Boolean(openGroups[item.title]);
              const groupActive = item.items.some((sub) => location.pathname.startsWith(sub.to));

              return (
                <li key={item.title} className="mb-0.5">
                  <button
                    type="button"
                    className={`w-full flex items-center pl-4 pr-3 py-2 rounded-lg transition ${
                      groupActive
                        ? 'bg-linear-to-r from-violet-500/12 dark:from-violet-500/24 to-violet-500/4 text-gray-800 dark:text-gray-100'
                        : 'text-gray-800 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    aria-expanded={isOpen}
                    onClick={() => toggleGroup(item.title)}
                  >
                    {icons[item.icon]}
                    <span className="text-sm font-medium ml-4">{item.title}</span>
                    <svg
                      className={`w-3 h-3 shrink-0 ml-auto fill-current text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      viewBox="0 0 12 12"
                    >
                      <path d="M4.293 1.293a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414-1.414L7.586 6 4.293 2.707a1 1 0 0 1 0-1.414Z" />
                    </svg>
                  </button>

                  <div className={`overflow-hidden transition-all ${isOpen ? 'max-h-96 mt-1' : 'max-h-0'}`}>
                    <ul className="pl-8 pr-2 space-y-0.5 border-l border-gray-100 dark:border-gray-700/60 ml-6">
                      {item.items.map((subItem) => (
                        <li key={subItem.to}>
                          <NavLink
                            to={subItem.to}
                            className={subLinkClass}
                            onClick={() => setSidebarOpen(false)}
                          >
                            {subItem.title}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
