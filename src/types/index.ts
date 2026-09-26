import type { ReactNode } from 'react';

export type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  hourly_rate?: string | null;
  flat_rate?: boolean;
  roles?: string[];
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
};

export type Customer = {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  home_address?: string | null;
  home_city?: string | null;
  home_state?: string | null;
  home_zip_code?: string | null;
  home_country?: string | null;
  office_address?: string | null;
  office_city?: string | null;
  office_state?: string | null;
  office_zip_code?: string | null;
  office_country?: string | null;
  phone: string;
  phone_2?: string | null;
  email?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Vehicle = {
  id: number;
  customer_id: number;
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    name?: string;
  } | null;
  year: number;
  make: string;
  model: string;
  sub_model?: string | null;
  transmission?: string | null;
  engine_size?: string | null;
  drivetrain?: string | null;
  type: string;
  mileage?: number | null;
  vin?: string | null;
  name: string;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type VehicleOptions = {
  transmissions: string[];
  drivetrains: string[];
  types: string[];
};

export type Role = {
  id: number;
  name: string;
  permissions: string[];
  users_count: number;
  created_at?: string;
};

export type Permission = {
  id: number;
  name: string;
  roles_count: number;
  created_at?: string;
};

export type NamedRecord = {
  id: number;
  name: string;
  products_count: number;
};

export type ProductImage = {
  id: number;
  url: string;
  is_main: boolean;
};

export type Product = {
  id: number;
  name: string;
  description: string | null;
  unit_price: string;
  margin: string;
  retail_price: string;
  stock_quantity: number;
  brand_id: number | null;
  brand_name: string | null;
  category_id: number;
  category_name: string | null;
  upc_code: string | null;
  part_number: string | null;
  is_taxable: boolean;
  image_url: string | null;
  images: ProductImage[];
};

export type CatalogOption = {
  id: number;
  name: string;
};

export type GeneralSettings = {
  company_name: string | null;
  website: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  timezone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
};

export type ShopSuppliesCap = 'none' | 'order';

export type FeeType = 'percent' | 'fixed';

export type FeeSettings = {
  shop_supplies_cap: ShopSuppliesCap;
  shop_supplies_cap_amount: string | null;
  shop_supplies_fee: string;
  shop_supplies_fee_type: FeeType;
  shop_supplies_on_parts: boolean;
  shop_supplies_on_labor: boolean;
  epa_rate: string;
  epa_on_parts: boolean;
  epa_on_labor: boolean;
  tax_rate: string;
  tax_on_parts: boolean;
  tax_on_labor: boolean;
  tax_on_epa: boolean;
  tax_on_shop_supplies: boolean;
  tax_on_subcontract: boolean;
};

export type RegisterFormData = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export type ValidationErrors = Record<string, string[]>;

export type NavIcon = 'dashboard' | 'inventory' | 'people' | 'settings';

export type NavLinkItem = {
  type: 'link';
  title: string;
  to: string;
  icon: NavIcon;
};

export type NavGroupItem = {
  type: 'group';
  title: string;
  icon: NavIcon;
  items: Array<{
    title: string;
    to: string;
  }>;
};

export type NavItem = NavLinkItem | NavGroupItem;

export type TableColumn<T extends { id: string | number }> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
};

export type ThemeName = 'light' | 'dark';
