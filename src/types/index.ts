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

export type EstimateOrderStatus = 'estimate' | 'invoice';

export type EstimateWorkflow = 'estimates' | 'dropped_off' | 'in_progress' | 'completed' | 'invoices' | 'cancelled' | `custom-${string}`;

export type EstimateItemType = 'part' | 'labor' | 'tire' | 'subcontract' | 'fee';

export type EstimateLineItem = {
  id?: number;
  type: EstimateItemType;
  description?: string | null;
  price: string | number;
  quantity: string | number;
  discount?: string | number | null;
  status?: string | null;
  remarks?: string[] | null;
  technician_id?: number | null;
  technician?: { id: number; name: string } | null;
  subtotal?: string;
};

export type EstimateService = {
  id?: number;
  name?: string | null;
  notes?: string | null;
  authorized?: boolean;
  discount_percent: string | number;
  epa_percent: string | number;
  shop_supplies_percent: string | number;
  tax_percent: string | number;
  line_items: EstimateLineItem[];
  subtotal?: string;
};

export type EstimateTotals = {
  parts: string;
  labor: string;
  tires: string;
  subcontract: string;
  fees: string;
  subtotal: string;
  discount: string;
  shop_supplies: string;
  epa: string;
  tax: string;
  grand_total: string;
  paid_to_date: string;
};

export type Estimate = {
  id: number;
  number: number;
  display_number: string;
  invoice_number?: string | null;
  order_number?: string | null;
  customer_id: number;
  vehicle_id?: number | null;
  service_writer_id?: number | null;
  due_date?: string | null;
  customer_comments?: string | null;
  recommendations?: string | null;
  po_number?: string | null;
  completed_at?: string | null;
  payment_terms: string;
  order_status: EstimateOrderStatus;
  workflow: EstimateWorkflow;
  workflow_label?: string;
  authorized_at?: string | null;
  is_authorized: boolean;
  labels?: string[] | null;
  customer?: Pick<Customer, 'id' | 'first_name' | 'last_name' | 'name' | 'phone' | 'email'> | null;
  vehicle?: Pick<Vehicle, 'id' | 'customer_id' | 'year' | 'make' | 'model' | 'sub_model' | 'name' | 'vin' | 'mileage'> | null;
  service_writer?: Pick<User, 'id' | 'name'> | null;
  services: EstimateService[];
  totals: EstimateTotals;
  created_at?: string;
  updated_at?: string;
};

export type CannedJobLineItem = {
  id?: number;
  type: EstimateItemType;
  description?: string | null;
  price: string | number;
  quantity: string | number;
  discount?: string | number | null;
  remarks?: string[] | null;
  subtotal?: string;
};

export type CannedJob = {
  id: number;
  name: string;
  line_items: CannedJobLineItem[];
  subtotal?: string;
  created_at?: string;
  updated_at?: string;
};

export type EstimateOptionItem = {
  id: number;
  name: string;
  customer_id?: number;
};

export type EstimateTechnician = {
  id: number;
  name: string;
  hourly_rate: string | null;
  flat_rate: boolean;
};

export type EstimateOptions = {
  payment_terms: string[];
  order_statuses: EstimateOrderStatus[];
  workflows: Array<{ value: EstimateWorkflow; label: string }>;
  item_types: Array<{ value: EstimateItemType; label: string }>;
  fee_defaults: {
    epa_percent: string;
    shop_supplies_percent: string;
    tax_percent: string;
  };
  service_writers: EstimateOptionItem[];
  technicians: EstimateTechnician[];
  customers: EstimateOptionItem[];
  vehicles: EstimateOptionItem[];
};

export type RegisterFormData = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export type ValidationErrors = Record<string, string[]>;

export type NavIcon = 'dashboard' | 'inventory' | 'people' | 'settings' | 'transactions';

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
  sortValue?: (row: T) => string | number | boolean | null | undefined;
};

export type ThemeName = 'light' | 'dark';
