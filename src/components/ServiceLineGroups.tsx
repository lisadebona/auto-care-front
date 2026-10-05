import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import type { EstimateItemType, Product } from '../types';

export type ServiceLineItem = {
  key: string;
  type: EstimateItemType;
  description: string;
  price: string;
  quantity: string;
  discount: string;
  remarks: string[];
};

export const lineItemGroupOrder: EstimateItemType[] = ['labor', 'part', 'tire', 'subcontract', 'fee'];

export const lineItemGroupMeta: Record<EstimateItemType, { title: string; addLabel: string; shortLabel: string; placeholder: string }> = {
  labor: { title: 'Labor', addLabel: 'Add Labor', shortLabel: 'Labor', placeholder: 'Enter labor...' },
  part: { title: 'Parts', addLabel: 'Add Part', shortLabel: 'Parts', placeholder: 'Enter part description' },
  tire: { title: 'Tires', addLabel: 'Add Tire', shortLabel: 'Tires', placeholder: 'Enter tire description' },
  subcontract: { title: 'Subcontract', addLabel: 'Add Subcontract', shortLabel: 'Sub.', placeholder: 'Enter subcontract description' },
  fee: { title: 'Fees', addLabel: 'Add Fee', shortLabel: 'Fee', placeholder: 'Enter fee description' },
};

export function lineItemSubtotal(item: Pick<ServiceLineItem, 'price' | 'quantity' | 'discount'>): number {
  const gross = Number(item.price || 0) * Number(item.quantity || 0);
  const discount = Number(item.discount || 0);
  return Math.max(gross - discount, 0);
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

type ProductSuggestion = Pick<Product, 'id' | 'name' | 'part_number' | 'upc_code' | 'retail_price'>;

function PartDescriptionInput({
  value,
  disabled,
  placeholder = 'Enter part description',
  onDescriptionChange,
  onSelectProduct,
}: {
  value: string;
  disabled: boolean;
  placeholder?: string;
  onDescriptionChange: (value: string) => void;
  onSelectProduct: (product: ProductSuggestion) => void;
}) {
  const { hasPermission } = usePermission();
  const canSearchProducts = hasPermission('products.view');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  const placeMenu = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setMenuStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 256),
    });
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  useEffect(() => () => {
    requestId.current += 1;
  }, []);

  const searchProducts = (query: string) => {
    const keyword = query.trim();
    if (!canSearchProducts || keyword.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    window.setTimeout(() => {
      if (requestId.current !== currentRequest) {
        return;
      }

      void apiClient.get<{ products: Product[] }>('/api/products', {
        params: { search: keyword },
      }).then((response) => {
        if (requestId.current !== currentRequest) {
          return;
        }

        const normalized = keyword.toLowerCase();
        const matches = response.data.products
          .slice()
          .sort((left, right) => {
            const leftStarts = left.name.toLowerCase().startsWith(normalized) ? 0 : 1;
            const rightStarts = right.name.toLowerCase().startsWith(normalized) ? 0 : 1;
            return leftStarts - rightStarts || left.name.localeCompare(right.name);
          })
          .slice(0, 8)
          .map((product) => ({
            id: product.id,
            name: product.name,
            part_number: product.part_number,
            upc_code: product.upc_code,
            retail_price: product.retail_price,
          }));

        setSuggestions(matches);
        placeMenu();
        setOpen(true);
      }).catch(() => {
        if (requestId.current === currentRequest) {
          setSuggestions([]);
          setOpen(false);
        }
      });
    }, 200);
  };

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        className="form-input w-full"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(event) => {
          onDescriptionChange(event.target.value);
          searchProducts(event.target.value);
        }}
        onFocus={() => {
          if (value.trim().length > 0 && suggestions.length > 0) {
            placeMenu();
            setOpen(true);
          }
        }}
      />
      {open && menuStyle && (
        <ul
          className="fixed z-50 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">No products found.</li>
          ) : suggestions.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-violet-50 dark:hover:bg-violet-500/10"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelectProduct(product);
                  setOpen(false);
                  setSuggestions([]);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-800 dark:text-gray-100">{product.name}</span>
                  {(product.part_number || product.upc_code) && (
                    <span className="block truncate text-xs text-gray-500">
                      {[product.part_number, product.upc_code].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-gray-600 dark:text-gray-300">
                  {money(Number(product.retail_price))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LineItemRemarks({
  remarks,
  disabled,
  onChange,
}: {
  remarks: string[];
  disabled: boolean;
  onChange: (remarks: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const addRemark = () => {
    const next = draft.trim();
    setDraft('');
    setAdding(false);

    if (next === '' || remarks.some((remark) => remark.toLowerCase() === next.toLowerCase())) {
      return;
    }

    onChange([...remarks, next]);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {remarks.map((remark) => (
        <button
          key={remark}
          type="button"
          disabled={disabled}
          onClick={() => onChange(remarks.filter((current) => current !== remark))}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 disabled:cursor-default dark:bg-gray-700 dark:text-gray-200"
          aria-label={`Remove remark ${remark}`}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <path d="M3.5 8.2 6.2 11 12.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {remark}
        </button>
      ))}
      {!disabled && !adding && (
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10"
          onClick={() => setAdding(true)}
          aria-label="Add remark"
        >
          +
        </button>
      )}
      {!disabled && adding && (
        <input
          autoFocus
          className="form-input w-36 py-1 text-xs"
          placeholder="Add remark"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addRemark();
            }
            if (event.key === 'Escape') {
              setDraft('');
              setAdding(false);
            }
          }}
          onBlur={addRemark}
        />
      )}
    </div>
  );
}

export function ItemTypeIcon({ type }: { type: EstimateItemType }) {
  const className = 'h-4 w-4 shrink-0';

  if (type === 'labor') {
    return (
      <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
        <path d="M14.6 3.4a3 3 0 0 0-4 3.9L4.2 13.7a1.6 1.6 0 1 0 2.2 2.2l6.4-6.4a3 3 0 0 0 3.9-4l-2 2-2.1-2.1 2-2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'part') {
    return (
      <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
        <path d="M3.5 7.2 10 4l6.5 3.2v6.1L10 16.5 3.5 13.3V7.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M3.5 7.2 10 10.4l6.5-3.2M10 10.4v6.1" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'tire') {
    return (
      <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="6.2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="10" cy="10" r="2.1" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10 3.8v2.2M10 14v2.2M3.8 10h2.2M14 10h2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'subcontract') {
    return (
      <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
        <path d="M6 3.5h5.2L15.5 7.8V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-11.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M11 3.6V8h4.3M7.2 11h5.6M7.2 13.6h3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path d="M6.5 3.5h7v13l-1.7-1.1L10 16.6l-1.8-1.2-1.7 1.1v-13Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 7.2h4M8 9.8h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5.2v5.6M5.2 8h5.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function ServiceLineGroups({
  items,
  canEdit,
  showTagsAndDiscount = true,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: ServiceLineItem[];
  canEdit: boolean;
  showTagsAndDiscount?: boolean;
  onAdd: (type: EstimateItemType) => void;
  onUpdate: (itemKey: string, changes: Partial<ServiceLineItem>) => void;
  onRemove: (itemKey: string) => void;
}) {
  const groups = lineItemGroupOrder
    .map((type) => ({ type, items: items.filter((item) => item.type === type) }))
    .filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 px-3 py-3">
      {groups.map((group) => (
        <LineItemGroup
          key={group.type}
          type={group.type}
          items={group.items}
          canEdit={canEdit}
          showTagsAndDiscount={showTagsAndDiscount}
          onAdd={onAdd}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function LineItemGroup({
  type,
  items,
  canEdit,
  showTagsAndDiscount,
  onAdd,
  onUpdate,
  onRemove,
}: {
  type: EstimateItemType;
  items: ServiceLineItem[];
  canEdit: boolean;
  showTagsAndDiscount: boolean;
  onAdd: (type: EstimateItemType) => void;
  onUpdate: (itemKey: string, changes: Partial<ServiceLineItem>) => void;
  onRemove: (itemKey: string) => void;
}) {
  const meta = lineItemGroupMeta[type];
  const isLabor = type === 'labor';

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700/60">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-900/40">
          <tr>
            <th className="px-3 py-2 text-left font-medium">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                <span className="text-violet-600 dark:text-violet-400"><ItemTypeIcon type={type} /></span>
                {meta.title}
              </span>
            </th>
            {isLabor ? (
              <>
                {showTagsAndDiscount && <th className="px-3 py-2 text-left font-medium">Tags</th>}
                <th className="w-24 px-3 py-2 text-left font-medium">Hours</th>
                <th className="w-28 px-3 py-2 text-left font-medium">Rate/hr</th>
              </>
            ) : (
              <>
                <th className="w-24 px-3 py-2 text-left font-medium">Qty</th>
                <th className="w-28 px-3 py-2 text-left font-medium">Price</th>
                {showTagsAndDiscount && <th className="px-3 py-2 text-left font-medium">Tags</th>}
              </>
            )}
            {showTagsAndDiscount && <th className="w-24 px-3 py-2 text-left font-medium">Discount</th>}
            <th className="w-28 px-3 py-2 text-right font-medium">Subtotal</th>
            <th className="w-8 px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {items.map((item) => (
            <tr key={item.key}>
              <td className="px-3 py-2">
                {type === 'part' || type === 'tire' ? (
                  <PartDescriptionInput
                    value={item.description}
                    disabled={!canEdit}
                    placeholder={meta.placeholder}
                    onDescriptionChange={(description) => onUpdate(item.key, { description })}
                    onSelectProduct={(product) => onUpdate(item.key, {
                      description: product.name,
                      price: Number(product.retail_price).toFixed(2),
                    })}
                  />
                ) : (
                  <input
                    className="form-input w-full"
                    placeholder={meta.placeholder}
                    value={item.description}
                    disabled={!canEdit}
                    onChange={(event) => onUpdate(item.key, { description: event.target.value })}
                  />
                )}
              </td>
              {isLabor ? (
                <>
                  {showTagsAndDiscount && (
                    <td className="px-3 py-2">
                      <LineItemRemarks
                        remarks={item.remarks}
                        disabled={!canEdit}
                        onChange={(remarks) => onUpdate(item.key, { remarks })}
                      />
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <input
                      className="form-input w-full"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      disabled={!canEdit}
                      aria-label="Hours"
                      onChange={(event) => onUpdate(item.key, { quantity: event.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="form-input w-full"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      disabled={!canEdit}
                      aria-label="Rate per hour"
                      onChange={(event) => onUpdate(item.key, { price: event.target.value })}
                    />
                  </td>
                </>
              ) : (
                <>
                  <td className="px-3 py-2">
                    <input
                      className="form-input w-full"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      disabled={!canEdit}
                      aria-label="Quantity"
                      onChange={(event) => onUpdate(item.key, { quantity: event.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="form-input w-full"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      disabled={!canEdit}
                      aria-label="Price"
                      onChange={(event) => onUpdate(item.key, { price: event.target.value })}
                    />
                  </td>
                  {showTagsAndDiscount && (
                    <td className="px-3 py-2">
                      <LineItemRemarks
                        remarks={item.remarks}
                        disabled={!canEdit}
                        onChange={(remarks) => onUpdate(item.key, { remarks })}
                      />
                    </td>
                  )}
                </>
              )}
              {showTagsAndDiscount && (
                <td className="px-3 py-2">
                  <input
                    className="form-input w-full"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.discount}
                    disabled={!canEdit}
                    aria-label="Discount"
                    onChange={(event) => onUpdate(item.key, { discount: event.target.value })}
                  />
                </td>
              )}
              <td className="px-3 py-2 text-right font-medium">{money(lineItemSubtotal(item))}</td>
              <td className="px-2 py-2">
                {canEdit && (
                  <button
                    type="button"
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => onRemove(item.key)}
                    aria-label={`Remove ${meta.title.toLowerCase()} item`}
                  >
                    ×
                  </button>
                )}
              </td>
            </tr>
          ))}
          {canEdit && (
            <tr>
              <td colSpan={showTagsAndDiscount ? 7 : 5} className="px-3 py-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:underline dark:text-violet-400"
                  onClick={() => onAdd(type)}
                >
                  <PlusCircleIcon />
                  {meta.addLabel}
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
