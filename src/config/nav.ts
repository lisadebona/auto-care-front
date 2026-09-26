import type { NavItem } from '../types';

export const navGroups: NavItem[] = [
  {
    type: 'link',
    title: 'Dashboard',
    to: '/dashboard',
    icon: 'dashboard',
  },
  {
    type: 'group',
    title: 'Inventory',
    icon: 'inventory',
    items: [
      { title: 'Products', to: '/products' },
      { title: 'Brands', to: '/brands' },
      { title: 'Categories', to: '/categories' },
    ],
  },
  {
    type: 'group',
    title: 'Customers & Vendors',
    icon: 'people',
    items: [
      { title: 'Customers', to: '/customers' },
      { title: 'Vehicles', to: '/vehicles' },
    ],
  },
  {
    type: 'group',
    title: 'Settings',
    icon: 'settings',
    items: [
      { title: 'General Settings', to: '/settings/general' },
      { title: 'Fees & Rates', to: '/settings/fees-and-rates' },
      { title: 'Users', to: '/users' },
      { title: 'Roles', to: '/roles' },
      { title: 'Permissions', to: '/permissions' },
    ],
  },
];
