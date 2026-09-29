import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import ModulePage from '../components/ModulePage';
import { SortHeader, TablePagination } from '../components/TableControls';
import apiClient, { postForm } from '../api/axios';
import { usePermission } from '../hooks/usePermission';
import { useTableControls } from '../hooks/useTableControls';
import type { CatalogOption, Product, ValidationErrors } from '../types';

type ProductsResponse = {
  products: Product[];
  brands: CatalogOption[];
  categories: CatalogOption[];
};

type ProductForm = {
  name: string;
  description: string;
  unit_price: string;
  margin: string;
  stock_quantity: string;
  brand_id: string;
  category_id: string;
  upc_code: string;
  part_number: string;
  is_taxable: boolean;
};

const emptyForm = (categoryId = ''): ProductForm => ({
  name: '',
  description: '',
  unit_price: '',
  margin: '',
  stock_quantity: '0',
  brand_id: '',
  category_id: categoryId,
  upc_code: '',
  part_number: '',
  is_taxable: true,
});

const retailPrice = (unitPrice: string, margin: string): string => {
  const price = Number.parseFloat(unitPrice);
  const marginPercent = Number.parseFloat(margin);
  if (Number.isNaN(price)) {
    return '';
  }
  return (price * (1 + (Number.isNaN(marginPercent) ? 0 : marginPercent) / 100)).toFixed(2);
};

const MAX_PHOTOS = 10;

type GalleryItem = {
  key: string;
  url: string;
  file?: File;
  existingId?: number;
};

function revokeNewPhotos(items: GalleryItem[]): void {
  items.forEach((item) => {
    if (item.file) {
      URL.revokeObjectURL(item.url);
    }
  });
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 ${filled ? 'fill-amber-400 text-amber-400' : 'fill-none text-gray-700'}`} aria-hidden="true">
      <path stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" d="M10 2.4l2.05 4.16 4.59.67-3.32 3.24.78 4.57L10 13.05l-4.1 2.16.78-4.57L3.36 7.23l4.59-.67L10 2.4z" />
    </svg>
  );
}

export default function Products() {
  const { hasPermission } = usePermission();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [mainKey, setMainKey] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const imageSequence = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const table = useTableControls(products, {
    name: (product) => product.name,
    brand: (product) => product.brand_name,
    category: (product) => product.category_name,
    stock: (product) => product.stock_quantity,
    unitPrice: (product) => Number(product.unit_price),
    retail: (product) => Number(product.retail_price),
  });

  const defaultCategoryId = useMemo(
    () => String(categories.find((category) => category.name === 'Uncategorized')?.id ?? categories[0]?.id ?? ''),
    [categories],
  );

  const loadProducts = async (query = search) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<ProductsResponse>('/api/products', {
        params: query ? { search: query } : {},
      });
      setProducts(response.data.products);
      setBrands(response.data.brands);
      setCategories(response.data.categories);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to load products.');
      } else {
        setError('Unable to load products.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts(search);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const resetGallery = (items: GalleryItem[] = [], nextMainKey: string | null = null) => {
    setGallery((current) => {
      revokeNewPhotos(current);
      return items;
    });
    setMainKey(nextMainKey);
  };

  const closeModal = () => {
    setIsCreating(false);
    setEditing(null);
    setForm(emptyForm(defaultCategoryId));
    resetGallery();
    setFieldErrors({});
  };

  const openCreate = () => {
    setFieldErrors({});
    setEditing(null);
    setForm(emptyForm(defaultCategoryId));
    resetGallery();
    setIsCreating(true);
  };

  const openEdit = (product: Product) => {
    setFieldErrors({});
    setIsCreating(false);
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? '',
      unit_price: product.unit_price,
      margin: product.margin,
      stock_quantity: String(product.stock_quantity),
      brand_id: product.brand_id ? String(product.brand_id) : '',
      category_id: String(product.category_id),
      upc_code: product.upc_code ?? '',
      part_number: product.part_number ?? '',
      is_taxable: product.is_taxable,
    });
    const items = product.images.slice(0, MAX_PHOTOS).map((image) => ({
      key: `existing-${image.id}`,
      url: image.url,
      existingId: image.id,
    }));
    const mainImage = product.images.find((image) => image.is_main) ?? product.images[0];
    resetGallery(items, mainImage ? `existing-${mainImage.id}` : null);
  };

  const addPhotos = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []).slice(0, Math.max(MAX_PHOTOS - gallery.length, 0));
    if (files.length === 0) {
      return;
    }

    const items = files.map((file) => ({
      key: `new-${imageSequence.current++}`,
      url: URL.createObjectURL(file),
      file,
    }));
    setGallery((current) => [...current, ...items]);
    setMainKey((main) => main ?? items[0].key);
  };

  const removePhoto = (item: GalleryItem) => {
    if (item.file) {
      URL.revokeObjectURL(item.url);
    }
    const remaining = gallery.filter((photo) => photo.key !== item.key);
    setGallery(remaining);
    if (mainKey === item.key) {
      setMainKey(remaining[0]?.key ?? null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setSubmitting(true);

    const body = new FormData();
    body.append('name', form.name);
    body.append('description', form.description);
    body.append('unit_price', form.unit_price);
    body.append('margin', form.margin);
    body.append('stock_quantity', form.stock_quantity || '0');
    if (form.brand_id) {
      body.append('brand_id', form.brand_id);
    }
    body.append('category_id', form.category_id);
    body.append('upc_code', form.upc_code);
    body.append('part_number', form.part_number);
    body.append('is_taxable', form.is_taxable ? '1' : '0');
    const newPhotos = gallery.filter((item) => item.file);
    newPhotos.forEach((item) => {
      if (item.file) {
        body.append('images[]', item.file);
      }
    });
    const mainPhoto = gallery.find((item) => item.key === mainKey);
    if (editing) {
      body.append('manage_images', '1');
      gallery.forEach((item) => {
        if (item.existingId) {
          body.append('retained_image_ids[]', String(item.existingId));
        }
      });
    }
    if (mainPhoto?.existingId) {
      body.append('main_existing_image_id', String(mainPhoto.existingId));
    } else if (mainPhoto?.file) {
      const mainIndex = newPhotos.findIndex((item) => item.key === mainPhoto.key);
      if (mainIndex >= 0) {
        body.append('main_new_image_index', String(mainIndex));
      }
    }

    try {
      if (editing) {
        await postForm(`/api/products/${editing.id}`, body);
      } else {
        await postForm('/api/products', body);
      }
      closeModal();
      await loadProducts();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setFieldErrors((err.response.data as { errors?: ValidationErrors }).errors ?? {});
      } else if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setFieldErrors({ form: [typeof message === 'string' ? message : 'Unable to save product.'] });
      } else {
        setFieldErrors({ form: ['Unable to save product.'] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }
    try {
      await apiClient.delete(`/api/products/${product.id}`);
      await loadProducts();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? message : 'Unable to delete product.');
      }
    }
  };

  return (
    <ModulePage
      title="Products"
      description="Manage parts and products in inventory."
      action={hasPermission('products.create') ? (
        <button type="button" onClick={openCreate} className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white">
          Add New Product
        </button>
      ) : undefined}
    >
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search products..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            table.setPage(1);
          }}
          className="form-input w-full max-w-xs"
        />
      </div>

      {loading && <div className="py-8 text-sm text-center text-gray-500">Loading products…</div>}
      {!loading && error && <div className="mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{error}</div>}

      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-x-auto">
          <table className="table-auto w-full">
            <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="p-2 w-12"><div className="font-semibold text-left">#</div></th>
                <th className="p-2 text-left"><SortHeader label="Name" column="name" table={table} /></th>
                <th className="p-2 text-left"><SortHeader label="Brand" column="brand" table={table} /></th>
                <th className="p-2 text-left"><SortHeader label="Category" column="category" table={table} /></th>
                <th className="p-2 text-left"><SortHeader label="Stock" column="stock" table={table} /></th>
                <th className="p-2 text-left"><SortHeader label="Unit Price" column="unitPrice" table={table} /></th>
                <th className="p-2 text-left"><SortHeader label="Retail" column="retail" table={table} /></th>
                <th className="p-2"><div className="font-semibold text-right">Actions</div></th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">No products yet. Add your first product to get started.</td>
                </tr>
              )}
              {table.pageRows.map((product, index) => (
                <tr key={product.id}>
                  <td className="p-2 text-gray-500 dark:text-gray-400">{table.offset + index + 1}</td>
                  <td className="p-2 font-medium text-gray-800 dark:text-gray-100">{product.name}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-300">{product.brand_name || '—'}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-300">{product.category_name || '—'}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-300">{product.stock_quantity}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-300">${product.unit_price}</td>
                  <td className="p-2 text-gray-600 dark:text-gray-300">${product.retail_price}</td>
                  <td className="p-2 text-right whitespace-nowrap space-x-3">
                    {hasPermission('products.edit') && (
                      <button type="button" onClick={() => openEdit(product)} className="text-sm font-medium text-violet-500 hover:text-violet-600">
                        Edit
                      </button>
                    )}
                    {hasPermission('products.delete') && (
                      <button type="button" onClick={() => { void handleDelete(product); }} className="text-sm font-medium text-red-500 hover:text-red-600">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination table={table} />
        </div>
      )}

      {(isCreating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-lg">
            <div className="shrink-0 px-6 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {editing ? 'Edit Product' : 'Create New Product'}
              </h3>
              {fieldErrors.form && (
                <div className="mt-4 rounded-lg bg-red-500/10 text-red-500 text-sm px-3 py-2">{fieldErrors.form[0]}</div>
              )}
            </div>
            <form onSubmit={(e) => { void handleSubmit(e); }} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1" htmlFor="product-name">Name</label>
                  <input id="product-name" className="form-input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1" htmlFor="product-description">Description</label>
                  <textarea id="product-description" className="form-input w-full" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="product-price">Unit Price</label>
                  <input id="product-price" className="form-input w-full" type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} required />
                  {fieldErrors.unit_price && <p className="mt-1 text-xs text-red-500">{fieldErrors.unit_price[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="product-margin">Margin %</label>
                  <input id="product-margin" className="form-input w-full" type="number" min="0" step="0.01" value={form.margin} onChange={(e) => setForm({ ...form, margin: e.target.value })} required />
                  <p className="mt-1 text-xs text-gray-500">Retail: {retailPrice(form.unit_price, form.margin) ? `$${retailPrice(form.unit_price, form.margin)}` : '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="product-stock">Stock</label>
                  <input id="product-stock" className="form-input w-full" type="number" min="0" step="1" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="product-brand">Brand</label>
                  <select id="product-brand" className="form-select w-full" value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}>
                    <option value="">No brand</option>
                    {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="product-category">Category</label>
                  <select id="product-category" className="form-select w-full" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
                    <option value="">Select a category</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                  {fieldErrors.category_id && <p className="mt-1 text-xs text-red-500">{fieldErrors.category_id[0]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="product-upc">UPC</label>
                  <input id="product-upc" className="form-input w-full" value={form.upc_code} onChange={(e) => setForm({ ...form, upc_code: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="product-part">Part Number</label>
                  <input id="product-part" className="form-input w-full" value={form.part_number} onChange={(e) => setForm({ ...form, part_number: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" className="rounded border-gray-300 text-violet-500" checked={form.is_taxable} onChange={(e) => setForm({ ...form, is_taxable: e.target.checked })} />
                  Taxable
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="product-images">Photos</label>
                <input
                  id="product-images"
                  className="block w-full cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-gray-100 text-sm text-gray-800 file:mr-3 file:cursor-pointer file:border-0 file:bg-gray-200 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-800 hover:file:bg-gray-300 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 dark:file:bg-gray-600 dark:file:text-gray-100 dark:hover:file:bg-gray-500"
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = '';
                  }}
                />
                {gallery.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {gallery.map((item) => {
                      const isMain = item.key === mainKey;

                      return (
                        <div key={item.key} className="relative aspect-square overflow-hidden rounded-lg bg-[#e7e9fb]">
                          <img src={item.url} alt="" className="h-full w-full object-cover" />
                          <div className="absolute top-1.5 right-1.5 flex gap-1">
                            <button
                              type="button"
                              onClick={() => setMainKey(item.key)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-sm hover:bg-white"
                              aria-label={isMain ? 'Main photo' : 'Set as main photo'}
                              aria-pressed={isMain}
                            >
                              <StarIcon filled={isMain} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removePhoto(item)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-red-500 shadow-sm hover:bg-white hover:text-red-600"
                              aria-label="Remove photo"
                            >
                              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                                <path d="M5 6.5h10M8 6.5V5.2A1.2 1.2 0 0 1 9.2 4h1.6A1.2 1.2 0 0 1 12 5.2v1.3M7 6.5l.6 8.2a1 1 0 0 0 1 .9h2.8a1 1 0 0 0 1-.9l.6-8.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {fieldErrors.images && <p className="mt-1 text-xs text-red-500">{fieldErrors.images[0]}</p>}
                {fieldErrors.main_existing_image_id && <p className="mt-1 text-xs text-red-500">{fieldErrors.main_existing_image_id[0]}</p>}
                {fieldErrors.main_new_image_index && <p className="mt-1 text-xs text-red-500">{fieldErrors.main_new_image_index[0]}</p>}
              </div>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 px-6 py-4">
                <button type="button" onClick={closeModal} className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 text-gray-600 dark:text-gray-300">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-60">
                  {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModulePage>
  );
}
