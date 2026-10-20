import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lineItemGroupMeta, lineItemGroupOrder, lineItemSubtotal } from './ServiceLineGroups';
import { formatUsPhone } from '../utils/format';
import type { EstimateItemType, GeneralSettings } from '../types';

export type InvoiceLine = {
  type: EstimateItemType;
  description: string;
  quantity: string;
  price: string;
  discount: string;
  remarks: string[];
  technicianName: string;
};

export type InvoiceService = {
  name: string;
  notes: string;
  lineItems: InvoiceLine[];
};

export type InvoiceTotals = {
  parts: number;
  labor: number;
  tires: number;
  subcontract: number;
  fees: number;
  subtotal: number;
  discount: number;
  shopSupplies: number;
  epa: number;
  tax: number;
  grand: number;
  paid: number;
};

export type InvoiceParty = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type InvoiceVehicleInfo = {
  name: string;
  vin?: string | null;
  mileage?: number | null;
};

export type InvoicePrintData = {
  shop: GeneralSettings;
  invoiceNumber: string | null;
  estimateNumber: string;
  orderNumber: string | null;
  poNumber: string;
  dueDate: string;
  createdAt: string | null;
  paymentTerms: string;
  serviceWriter: string;
  authorized: boolean;
  customer: InvoiceParty | null;
  vehicle: InvoiceVehicleInfo | null;
  customerComments: string;
  recommendations: string;
  services: InvoiceService[];
  totals: InvoiceTotals;
};

function money(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatQty(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return value || '0';
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(parsed);
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const normalized = value.includes('T') || value.includes(' ') ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function cityLine(city?: string | null, state?: string | null, zip?: string | null): string {
  const stateZip = [state, zip].filter(Boolean).join(' ');
  return [city, stateZip].filter(Boolean).join(', ');
}

function phoneLabel(value?: string | null): string {
  if (!value) {
    return '';
  }

  const formatted = formatUsPhone(value);
  return formatted || value;
}

function visibleLines(service: InvoiceService): InvoiceLine[] {
  return service.lineItems.filter((item) => (
    item.description.trim() !== ''
    || Number(item.price || 0) !== 0
    || Number(item.discount || 0) !== 0
    || item.remarks.length > 0
  ));
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value || '—'}</dd>
    </div>
  );
}

export default function InvoicePrint({
  data,
  onClose,
}: {
  data: InvoicePrintData;
  onClose: () => void;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    const number = data.invoiceNumber ?? data.estimateNumber;
    document.title = `Invoice ${number}`;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.title = previousTitle;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [data.estimateNumber, data.invoiceNumber]);

  const services = data.services
    .map((service) => ({ ...service, lineItems: visibleLines(service) }))
    .filter((service) => service.name.trim() !== '' || service.notes.trim() !== '' || service.lineItems.length > 0);

  const showDiscount = services.some((service) => service.lineItems.some((item) => Number(item.discount || 0) > 0));
  const shopCity = cityLine(data.shop.city, data.shop.state, data.shop.zip_code);
  const customerCity = cityLine(data.customer?.city, data.customer?.state, data.customer?.zip);
  const balance = data.totals.grand - data.totals.paid;
  const totalRows: Array<{ label: string; value: number; emphasize?: boolean }> = [
    { label: 'Total Parts', value: data.totals.parts },
    { label: 'Total Labor', value: data.totals.labor },
    { label: 'Total Tires', value: data.totals.tires },
    { label: 'Total Subcontract', value: data.totals.subcontract },
    { label: 'Total Fees', value: data.totals.fees },
    { label: 'Subtotal', value: data.totals.subtotal },
    { label: 'Discount', value: data.totals.discount },
    { label: 'Shop Supplies', value: data.totals.shopSupplies },
    { label: 'EPA', value: data.totals.epa },
    { label: 'Tax', value: data.totals.tax },
  ].filter((row) => row.value !== 0 || row.label === 'Subtotal');
  totalRows.push(
    { label: 'Grand Total', value: data.totals.grand, emphasize: true },
    { label: 'Paid to Date', value: data.totals.paid },
  );

  return createPortal(
    <div className="invoice-print-root" role="dialog" aria-modal="true" aria-label="Invoice preview">
      <div className="invoice-print-toolbar sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <p className="text-sm font-medium text-gray-800">Invoice preview</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn border border-gray-200 bg-white text-gray-700"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="btn bg-gray-900 text-white hover:bg-gray-800"
            onClick={() => window.print()}
          >
            Print invoice
          </button>
        </div>
      </div>

      <div className="invoice-sheet mx-auto my-8 w-full max-w-[8.5in] bg-white px-10 py-10 text-gray-900 shadow-xl">
        <header className="flex items-start justify-between gap-8 border-b border-gray-900 pb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              {data.shop.logo_url && !logoFailed && (
                <img
                  src={data.shop.logo_url}
                  alt=""
                  className="h-14 w-auto max-w-[140px] object-contain"
                  onError={() => setLogoFailed(true)}
                />
              )}
              <div>
                <p className="text-xl font-semibold tracking-tight">
                  {data.shop.company_name || 'Auto Care'}
                </p>
                {data.shop.address && <p className="text-sm text-gray-600">{data.shop.address}</p>}
                {shopCity && <p className="text-sm text-gray-600">{shopCity}</p>}
              </div>
            </div>
            <div className="mt-3 space-y-0.5 text-sm text-gray-600">
              {data.shop.phone && <p>{phoneLabel(data.shop.phone)}</p>}
              {data.shop.email && <p>{data.shop.email}</p>}
              {data.shop.website && <p>{data.shop.website.replace(/^https?:\/\//, '')}</p>}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <h2 className="text-3xl font-semibold tracking-[0.14em]">INVOICE</h2>
            <dl className="mt-3 space-y-1 text-sm">
              {data.invoiceNumber && <Detail label="Invoice #" value={data.invoiceNumber} />}
              <Detail label="Estimate #" value={data.estimateNumber} />
              {data.orderNumber && <Detail label="Order #" value={data.orderNumber} />}
              <Detail label="Date" value={formatDate(data.createdAt)} />
              <Detail label="Due" value={formatDate(data.dueDate)} />
              <Detail label="PO" value={data.poNumber} />
              <Detail label="Terms" value={data.paymentTerms} />
            </dl>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-8 border-b border-gray-200 py-6 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Bill to</p>
            <p className="mt-2 font-semibold">{data.customer?.name || '—'}</p>
            {data.customer?.address && <p className="text-gray-700">{data.customer.address}</p>}
            {customerCity && <p className="text-gray-700">{customerCity}</p>}
            {data.customer?.phone && <p className="text-gray-700">{phoneLabel(data.customer.phone)}</p>}
            {data.customer?.email && <p className="text-gray-700">{data.customer.email}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Vehicle</p>
            <p className="mt-2 font-semibold">{data.vehicle?.name || '—'}</p>
            {data.vehicle?.vin && <p className="text-gray-700">VIN {data.vehicle.vin}</p>}
            {data.vehicle?.mileage != null && (
              <p className="text-gray-700">{data.vehicle.mileage.toLocaleString('en-US')} mi</p>
            )}
            <p className="mt-2 text-gray-700">Service writer: {data.serviceWriter || '—'}</p>
          </div>
        </section>

        <div className="pt-6">
          {services.length === 0 ? (
            <p className="text-sm text-gray-500">No services on this invoice.</p>
          ) : services.map((service, serviceIndex) => (
            <section key={`${service.name}-${serviceIndex}`} className="invoice-keep mb-6">
              <h3 className="text-sm font-semibold">{service.name || 'Service'}</h3>
              {service.notes && <p className="mt-1 text-sm text-gray-600">{service.notes}</p>}
              <table className="mt-2 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-3 font-medium">Description</th>
                    <th className="w-16 py-2 pr-3 text-right font-medium">Qty</th>
                    <th className="w-24 py-2 pr-3 text-right font-medium">Price</th>
                    {showDiscount && <th className="w-24 py-2 pr-3 text-right font-medium">Discount</th>}
                    <th className="w-28 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItemGroupOrder.map((type) => {
                    const items = service.lineItems.filter((item) => item.type === type);
                    if (items.length === 0) {
                      return null;
                    }

                    return (
                      <Fragment key={type}>
                        {items.map((item, itemIndex) => (
                      <tr key={`${type}-${itemIndex}`} className="border-b border-gray-100 align-top">
                        <td className="py-2 pr-3">
                          <p>
                            <span className="mr-2 text-xs uppercase tracking-wide text-gray-400">
                              {lineItemGroupMeta[type].shortLabel}
                            </span>
                            {item.description || '—'}
                          </p>
                          {item.technicianName && (
                            <p className="text-xs text-gray-500">Technician: {item.technicianName}</p>
                          )}
                          {item.remarks.length > 0 && (
                            <p className="text-xs text-gray-500">{item.remarks.join(', ')}</p>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right">{formatQty(item.quantity)}</td>
                        <td className="py-2 pr-3 text-right">{money(Number(item.price || 0))}</td>
                        {showDiscount && (
                          <td className="py-2 pr-3 text-right">
                            {Number(item.discount || 0) > 0 ? money(Number(item.discount)) : '—'}
                          </td>
                        )}
                        <td className="py-2 text-right">{money(lineItemSubtotal(item))}</td>
                      </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}
        </div>

        <div className="mt-2 flex justify-end">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            {totalRows.map((row) => (
              <div
                key={row.label}
                className={`flex justify-between gap-6 ${row.emphasize ? 'border-t border-gray-300 pt-2 font-semibold' : ''}`}
              >
                <dt className={row.emphasize ? '' : 'text-gray-500'}>{row.label}</dt>
                <dd>{money(row.value)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-6 border-t border-gray-900 pt-2 text-base font-semibold">
              <dt>Balance Due</dt>
              <dd>{money(balance)}</dd>
            </div>
          </dl>
        </div>

        <footer className="mt-8 space-y-3 border-t border-gray-200 pt-5 text-sm">
          <p>
            <span className="text-gray-500">Authorization: </span>
            {data.authorized ? 'Authorized' : 'Not yet authorized'}
          </p>
          {data.customerComments && (
            <p>
              <span className="text-gray-500">Customer comments: </span>
              {data.customerComments}
            </p>
          )}
          {data.recommendations && (
            <p>
              <span className="text-gray-500">Recommendations: </span>
              {data.recommendations}
            </p>
          )}
          <p className="text-gray-500">Thank you for your business.</p>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
