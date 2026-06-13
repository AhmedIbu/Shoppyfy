import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, apiErrorMessage } from '../api/axios';
import { Category, Product, money } from '../types';
import Spinner from '../components/Spinner';
import { onImgError } from '../utils/imgFallback';

type Tab = 'products' | 'categories';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  comparePrice: string;
  categoryId: string;
  sizes: string;
  colors: string;
  brand: string;
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
  stock: string;
  isFeatured: boolean;
}

const emptyForm: ProductForm = {
  name: '',
  description: '',
  price: '',
  comparePrice: '',
  categoryId: '',
  sizes: '',
  colors: '',
  brand: '',
  condition: 'NEW',
  stock: '1',
  isFeatured: false,
};

const underlineInput =
  'w-full bg-transparent border-0 border-b border-outline-variant py-2 focus:border-gold focus:ring-0 focus:outline-none text-body-md transition-colors';

export default function SellPage() {
  const [tab, setTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Product form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keepImages, setKeepImages] = useState<string[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Category form
  const [catName, setCatName] = useState('');
  const [catFile, setCatFile] = useState<File | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catSaving, setCatSaving] = useState(false);
  const [catMessage, setCatMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get<{ products: Product[] }>('/admin/products'),
        api.get<{ categories: Category[] }>('/categories'),
      ]);
      setProducts(productsRes.data.products);
      setCategories(categoriesRes.data.categories);
    } catch {
      /* surfaces via empty UI */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Product handlers ──────────────────────────────────
  const openCreate = () => {
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? '' });
    setEditingId(null);
    setKeepImages([]);
    setFiles(null);
    setMessage(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      comparePrice: p.comparePrice ? String(p.comparePrice) : '',
      categoryId: p.category.id,
      sizes: p.sizes.join(', '),
      colors: p.colors.join(', '),
      brand: p.brand ?? '',
      condition: p.condition,
      stock: String(p.stock),
      isFeatured: p.isFeatured,
    });
    setEditingId(p.id);
    setKeepImages([...p.images]);
    setFiles(null);
    setMessage(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const data = new FormData();
      data.append('name', form.name);
      data.append('description', form.description);
      data.append('price', form.price);
      if (form.comparePrice) data.append('comparePrice', form.comparePrice);
      data.append('categoryId', form.categoryId);
      data.append('sizes', form.sizes);
      data.append('colors', form.colors);
      if (form.brand) data.append('brand', form.brand);
      data.append('condition', form.condition);
      data.append('stock', form.stock);
      data.append('isFeatured', String(form.isFeatured));
      if (files) Array.from(files).forEach((f) => data.append('images', f));

      if (editingId) {
        keepImages.forEach((url) => data.append('keepImages', url));
        await api.patch(`/admin/products/${editingId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Product updated');
      } else {
        await api.post('/admin/products', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Product published');
      }
      setShowForm(false);
      load();
    } catch (err) {
      setMessage(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (p: Product) => {
    if (!window.confirm(`Permanently delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/products/${p.id}`);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  // ── Category handlers ─────────────────────────────────
  const resetCatForm = () => {
    setCatName('');
    setCatFile(null);
    setEditingCatId(null);
    setCatMessage(null);
  };

  const submitCategory = async () => {
    if (!catName.trim()) {
      setCatMessage('Category name is required');
      return;
    }
    setCatSaving(true);
    setCatMessage(null);
    try {
      const data = new FormData();
      data.append('name', catName.trim());
      if (catFile) data.append('image', catFile);
      if (editingCatId) {
        await api.patch(`/admin/categories/${editingCatId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Category updated');
      } else {
        await api.post('/admin/categories', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Category created');
      }
      resetCatForm();
      load();
    } catch (err) {
      setCatMessage(apiErrorMessage(err));
    } finally {
      setCatSaving(false);
    }
  };

  const editCategory = (c: Category) => {
    setEditingCatId(c.id);
    setCatName(c.name);
    setCatFile(null);
    setCatMessage(null);
  };

  const removeCategory = async (c: Category) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api.delete(`/admin/categories/${c.id}`);
      toast.success('Category deleted');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (loading) return <Spinner label="Loading your catalog" />;

  return (
    <main className="max-w-container mx-auto px-4 md:px-10 py-16">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-10">
        <div>
          <span className="text-label-md text-gold-dark uppercase tracking-widest mb-2 block">
            Catalog Management
          </span>
          <h1 className="font-display text-headline-md">Sell on SEMMAI</h1>
        </div>
        {tab === 'products' && (
          <button
            onClick={openCreate}
            className="rounded bg-primary text-on-primary px-8 py-3 text-label-md uppercase tracking-widest hover:bg-primary-container transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Product
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant mb-8">
        {(['products', 'categories'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-4 text-label-md uppercase tracking-widest capitalize ${
              tab === t
                ? 'text-gold-dark border-b-2 border-gold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t} ({t === 'products' ? products.length : categories.length})
          </button>
        ))}
      </div>

      {/* ── Products tab ── */}
      {tab === 'products' && (
        <>
          {showForm && (
            <div className="border border-outline-variant p-8 bg-surface-container-lowest mb-12 space-y-6">
              <h2 className="font-display text-headline-sm">
                {editingId ? 'Edit Product' : 'Create New Product'}
              </h2>

              {categories.length === 0 && (
                <p className="text-body-sm text-error">
                  You need at least one category first — add one in the Categories tab.
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-label-md text-on-surface-variant uppercase">Name</label>
                  <input
                    className={underlineInput}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-label-md text-on-surface-variant uppercase">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full bg-transparent border border-outline-variant p-3 focus:border-gold focus:ring-0 focus:outline-none text-body-md"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-md text-on-surface-variant uppercase">
                    Price (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={underlineInput}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-md text-on-surface-variant uppercase">
                    Compare-at Price (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={underlineInput}
                    value={form.comparePrice}
                    onChange={(e) => setForm({ ...form, comparePrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-md text-on-surface-variant uppercase">Category</label>
                  <select
                    className="w-full bg-transparent border-0 border-b border-outline-variant py-2 focus:ring-0 text-body-md"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-label-md text-on-surface-variant uppercase">
                    Condition
                  </label>
                  <select
                    className="w-full bg-transparent border-0 border-b border-outline-variant py-2 focus:ring-0 text-body-md"
                    value={form.condition}
                    onChange={(e) =>
                      setForm({ ...form, condition: e.target.value as ProductForm['condition'] })
                    }
                  >
                    <option value="NEW">New</option>
                    <option value="LIKE_NEW">Like New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-label-md text-on-surface-variant uppercase">
                    Sizes (comma-separated)
                  </label>
                  <input
                    className={underlineInput}
                    placeholder="XS, S, M, L"
                    value={form.sizes}
                    onChange={(e) => setForm({ ...form, sizes: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-md text-on-surface-variant uppercase">
                    Colors (comma-separated)
                  </label>
                  <input
                    className={underlineInput}
                    placeholder="Black, Ivory"
                    value={form.colors}
                    onChange={(e) => setForm({ ...form, colors: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-md text-on-surface-variant uppercase">Brand</label>
                  <input
                    className={underlineInput}
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-md text-on-surface-variant uppercase">Stock</label>
                  <input
                    type="number"
                    min="0"
                    className={underlineInput}
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>

                {/* Existing images (edit mode) */}
                {editingId && keepImages.length > 0 && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-label-md text-on-surface-variant uppercase">
                      Current images
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {keepImages.map((url) => (
                        <div key={url} className="relative w-20 h-24 group">
                          <img
                            src={url}
                            alt="Product"
                            onError={onImgError}
                            className="w-full h-full object-cover border border-outline-variant"
                          />
                          <button
                            type="button"
                            onClick={() => setKeepImages((prev) => prev.filter((u) => u !== url))}
                            aria-label="Remove image"
                            className="absolute -top-2 -right-2 bg-brand-red text-white w-5 h-5 rounded-full flex items-center justify-center material-symbols-outlined text-[14px]"
                          >
                            close
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1 md:col-span-2">
                  <label className="text-label-md text-on-surface-variant uppercase">
                    {editingId ? 'Add more images' : 'Product images'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFiles(e.target.files)}
                    className="w-full text-body-sm py-2 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-primary file:text-on-primary file:text-label-md file:uppercase file:cursor-pointer"
                  />
                  <p className="text-label-md text-on-surface-variant/70">
                    JPG, PNG, WEBP or AVIF · up to 6 images · 5MB each
                  </p>
                </div>

                <label className="flex items-center gap-3 md:col-span-2 text-body-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="w-4 h-4 text-gold focus:ring-0 border-outline-variant rounded-none"
                  />
                  Feature this product on the homepage
                </label>
              </div>

              {message && <p className="text-body-sm text-error">{message}</p>}
              <div className="flex gap-4 pt-2">
                <button
                  onClick={submit}
                  disabled={saving || categories.length === 0}
                  className="rounded bg-primary text-on-primary px-8 py-3 text-label-md uppercase tracking-widest hover:bg-primary-container transition-all disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Publish Product'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 text-label-md uppercase text-on-surface-variant hover:text-on-surface"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {products.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display text-headline-sm mb-2">No products yet</p>
              <p className="text-body-md text-on-surface-variant">
                Click “New Product” to add your first piece to the catalog.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant text-label-md uppercase text-on-surface-variant">
                    <th className="py-4 pr-4">Product</th>
                    <th className="py-4 pr-4">Category</th>
                    <th className="py-4 pr-4">Price</th>
                    <th className="py-4 pr-4">Stock</th>
                    <th className="py-4 pr-4">Featured</th>
                    <th className="py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-16 bg-surface-container overflow-hidden flex-shrink-0">
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              onError={onImgError}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <Link
                              to={`/products/${p.slug}`}
                              className="font-semibold hover:text-gold-dark"
                            >
                              {p.name}
                            </Link>
                            {p.brand && (
                              <p className="text-label-md text-on-surface-variant uppercase">
                                {p.brand}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-body-sm">{p.category.name}</td>
                      <td className="py-4 pr-4 text-body-sm font-semibold">{money(p.price)}</td>
                      <td className="py-4 pr-4 text-body-sm">{p.stock}</td>
                      <td className="py-4 pr-4">
                        {p.isFeatured && (
                          <span className="material-symbols-outlined filled text-gold text-[18px]">
                            star
                          </span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() => openEdit(p)}
                            aria-label="Edit"
                            className="material-symbols-outlined text-[20px] text-on-surface-variant hover:text-gold-dark"
                          >
                            edit
                          </button>
                          <button
                            onClick={() => removeProduct(p)}
                            aria-label="Delete"
                            title="Delete product"
                            className="material-symbols-outlined text-[20px] text-on-surface-variant hover:text-brand-red"
                          >
                            delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Categories tab ── */}
      {tab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="border border-outline-variant p-6 bg-surface-container-lowest space-y-5 sticky top-28">
              <h2 className="font-display text-headline-sm">
                {editingCatId ? 'Edit Category' : 'Add Category'}
              </h2>
              <div className="space-y-1">
                <label className="text-label-md text-on-surface-variant uppercase">Name</label>
                <input
                  className={underlineInput}
                  placeholder="e.g. Outerwear"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-label-md text-on-surface-variant uppercase">
                  Image {editingCatId ? '(replace, optional)' : '(optional)'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCatFile(e.target.files?.[0] ?? null)}
                  className="w-full text-body-sm py-2 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-primary file:text-on-primary file:text-label-md file:uppercase file:cursor-pointer"
                />
              </div>
              {catMessage && <p className="text-body-sm text-error">{catMessage}</p>}
              <div className="flex gap-3">
                <button
                  onClick={submitCategory}
                  disabled={catSaving}
                  className="rounded bg-primary text-on-primary px-6 py-3 text-label-md uppercase tracking-widest hover:bg-primary-container transition-all disabled:opacity-60"
                >
                  {catSaving ? 'Saving…' : editingCatId ? 'Save' : 'Add'}
                </button>
                {editingCatId && (
                  <button
                    onClick={resetCatForm}
                    className="px-4 py-3 text-label-md uppercase text-on-surface-variant hover:text-on-surface"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            {categories.length === 0 ? (
              <p className="text-body-md text-on-surface-variant py-12 text-center">
                No categories yet — add your first one.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 border border-outline-variant p-4 bg-surface-container-lowest"
                  >
                    <div className="w-16 h-16 bg-surface-container overflow-hidden flex-shrink-0">
                      {c.imageUrl ? (
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          onError={onImgError}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                          <span className="material-symbols-outlined">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      <p className="text-label-md text-on-surface-variant uppercase">
                        {c.productCount ?? 0} product{(c.productCount ?? 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => editCategory(c)}
                        aria-label="Edit category"
                        className="material-symbols-outlined text-[20px] text-on-surface-variant hover:text-gold-dark"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => removeCategory(c)}
                        aria-label="Delete category"
                        className="material-symbols-outlined text-[20px] text-on-surface-variant hover:text-brand-red"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
