import React from 'react';
import { createRoot } from 'react-dom/client';
import { createApiClient } from './lib/api';
import { createOidcAuthClient, type AuthClient, type AuthState } from './auth/oidc';
import { directionFor, messages, type Locale } from './i18n/locales';
import '@matjerhub/ui-sdk/styles.css';
import {
  DashboardLayout,
  LoadingState,
  ErrorState,
  Card,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
  Dialog,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@matjerhub/ui-sdk';
import './styles.css';

// ─── Types ──────────────────────────────────────────────────────────────────

type BootstrapPayload = {
  actor: string;
  direction: 'rtl' | 'ltr';
  principal?: { subject: string; preferred_username?: string };
};

type Supplier = { id: string; code: string; name: string; status: string };
type MarketRecord = { id: string; market_code: string; status: string; currency?: { code: string } };
type Location = { id: string; code: string; name: string; market_code: string; location_type: string; status: string };
type Product = { id: string; slug: string; supplier_code?: string; status: string };
type Offer = { id: string; market_code: string; status: string; supplier_code?: string; price?: { amount_minor: number; currency: string }; min_order_quantity?: number };
type Snapshot = { id: string; fulfillment_location_id: string; sku_id: string; on_hand_qty: number; reserved_qty: number; version: number };
type Movement = { id: string; inventory_snapshot_id: string; movement_type: string; quantity_delta: number; on_hand_qty: number; reserved_qty: number; reason: string; created_at: string };
type SyncJob = { id: string; connection_id: string; supplier_id: string; status: string; total_items: number; processed_items: number; failed_items: number; error_summary?: string };
type MediaItem = { id: string; url: string; is_primary: boolean };
type RetailCapability = { affiliation: { supplier_id: string; seller_id: string }; seller: { id: string; code: string; name: string; status: string } } | null;
type AffiliatedStore = { id: string; seller_id: string; market_code: string; code: string; name: string; status: string };

// ─── App bootstrap ───────────────────────────────────────────────────────────

const defaultLocale = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('locale') === 'ar' ? 'ar' : 'en') satisfies Locale;
const defaultAuthClient = createOidcAuthClient();

if (typeof document !== 'undefined') {
  document.documentElement.lang = defaultLocale;
  document.documentElement.dir = directionFor(defaultLocale);
}

// ─── App ─────────────────────────────────────────────────────────────────────

export function App({ initialPath, initialLocale, authClient }: { initialPath?: string; initialLocale?: Locale; authClient?: AuthClient } = {}) {
  const activeAuthClient = React.useMemo(() => authClient ?? defaultAuthClient, [authClient]);
  const [authState, setAuthState] = React.useState<AuthState>(() => activeAuthClient.getState());

  React.useEffect(() => {
    setAuthState(activeAuthClient.getState());
    return activeAuthClient.subscribe((state) => {
      setAuthState(state);
    });
  }, [activeAuthClient]);

  const api = React.useMemo(() => createApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
    getAccessToken: () => activeAuthClient.getAccessToken(),
    renewToken: () => activeAuthClient.renewToken(),
    onUnauthorized: () => { void activeAuthClient.clearSession({ error: 'Session expired' }); }
  }), [activeAuthClient]);
  const activeLocale = initialLocale ?? (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('locale') === 'ar' ? 'ar' : 'en');
  const copy = messages[activeLocale];

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = activeLocale;
      document.documentElement.dir = directionFor(activeLocale);
    }
  }, [activeLocale]);

  const navItems = [
    { id: 'dashboard', label: copy.nav.dashboard, path: '/dashboard' },
    { id: 'products', label: copy.nav.products, path: '/products' },
    { id: 'offers', label: copy.nav.offers, path: '/offers' },
    { id: 'inventory', label: copy.nav.inventory, path: '/inventory' },
    { id: 'locations', label: copy.nav.locations, path: '/locations' },
    { id: 'integrations', label: copy.nav.integrations, path: '/integrations' },
    { id: 'retail', label: copy.nav.retail, path: '/retail' },
    { id: 'settings', label: copy.nav.settings, path: '/settings' },
  ];
  // ── Core data ──
  const [bootstrap, setBootstrap] = React.useState<BootstrapPayload | null>(null);
  const [supplier, setSupplier] = React.useState<Supplier | null>(null);
  const [markets, setMarkets] = React.useState<MarketRecord[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [offers, setOffers] = React.useState<Offer[]>([]);
  const [snapshots, setSnapshots] = React.useState<Snapshot[]>([]);
  const [movements, setMovements] = React.useState<Movement[]>([]);
  const [syncJobs, setSyncJobs] = React.useState<SyncJob[]>([]);
  const [retailCapability, setRetailCapability] = React.useState<RetailCapability>(null);
  const [stores, setStores] = React.useState<AffiliatedStore[]>([]);
  const [mediaItems, setMediaItems] = React.useState<MediaItem[]>([]);

  // ── UI state ──
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [currentPath, setCurrentPath] = React.useState(() => {
    if (initialPath) return initialPath;
    const p = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
    return p && p !== '/' ? p : '/dashboard';
  });

  // ── Inventory tabs ──
  const [inventoryTab, setInventoryTab] = React.useState<'snapshots' | 'movements' | 'locations'>('snapshots');
  const [selectedSnapshotId, setSelectedSnapshotId] = React.useState<string | null>(null);

  // ── Dialog visibility ──
  const [showProductDialog, setShowProductDialog] = React.useState(false);
  const [showOfferDialog, setShowOfferDialog] = React.useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = React.useState(false);
  const [showLocationDialog, setShowLocationDialog] = React.useState(false);
  const [showRetailProvisionDialog, setShowRetailProvisionDialog] = React.useState(false);
  const [showCreateStoreDialog, setShowCreateStoreDialog] = React.useState(false);

  // ── Product form ──
  const [productForm, setProductForm] = React.useState({
    slug: '', supplierCode: '', status: 'active',
    nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '',
    skuCode: '', barcode: '', categoryIds: '',
  });

  // ── Offer form ──
  const [offerForm, setOfferForm] = React.useState({
    supplierProductId: '', supplierMarketId: '', marketCode: '',
    status: 'active', wholesalePrice: '', currency: 'EGP', moq: '1',
  });

  // ── Adjustment form ──
  const [adjustForm, setAdjustForm] = React.useState({
    quantityDelta: '0', reason: '', movementType: 'adjustment',
  });

  // ── Location form ──
  const [locationForm, setLocationForm] = React.useState({
    supplierMarketId: '', marketCode: '', code: '', name: '',
    locationType: 'warehouse', status: 'active',
  });

  // ── Retail provision form ──
  const [retailProvisionForm, setRetailProvisionForm] = React.useState({ code: '', name: '' });

  // ── Create store form ──
  const [createStoreForm, setCreateStoreForm] = React.useState({ marketCode: '', code: '', name: '' });

  // ── Settings form ──
  const [profileName, setProfileName] = React.useState('');
  const [profileStatus, setProfileStatus] = React.useState('active');
  const [profileSettings, setProfileSettings] = React.useState('{"tone":"stable"}');

  // ─── Callback & Auth routing ───────────────────────────────────────────────

  const [isCallbackProcessing, setIsCallbackProcessing] = React.useState(() => {
    if (initialPath === '/auth/callback') return true;
    return typeof window !== 'undefined' && window.location.pathname === '/auth/callback';
  });
  const [callbackError, setCallbackError] = React.useState<string | null>(null);
  const [isForbidden, setIsForbidden] = React.useState(false);

  React.useEffect(() => {
    if (currentPath === '/auth/callback') {
      let active = true;
      setIsCallbackProcessing(true);
      setCallbackError(null);
      activeAuthClient.handleCallback()
        .then((targetPath) => {
          if (active) {
            setIsCallbackProcessing(false);
            const safePath = targetPath || '/dashboard';
            setCurrentPath(safePath);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', safePath);
            }
          }
        })
        .catch((err) => {
          if (active) {
            setIsCallbackProcessing(false);
            setCallbackError(err instanceof Error ? err.message : 'Callback failed');
          }
        });
      return () => { active = false; };
    }
  }, [currentPath, activeAuthClient]);

  // ─── Load all data ────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!authState.isAuthenticated || currentPath === '/auth/callback') {
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setIsForbidden(false);

        const [bootRes, profileRes, marketsRes, locationsRes, productsRes, offersRes, inventoryRes, syncRes, retailRes, storesRes] = await Promise.all([
          api.get(`/v1/bootstrap?locale=${activeLocale}`),
          api.get(`/v1/supplier/profile?locale=${activeLocale}`),
          api.get(`/v1/supplier/markets?locale=${activeLocale}`),
          api.get(`/v1/supplier/locations?locale=${activeLocale}`),
          api.get(`/v1/supplier/products?locale=${activeLocale}`),
          api.get(`/v1/supplier/offers?locale=${activeLocale}`),
          api.get(`/v1/supplier/inventory?locale=${activeLocale}`),
          api.get(`/v1/supplier/integrations/sync-jobs?locale=${activeLocale}`).catch(() => null),
          api.get(`/v1/supplier/retail-capability?locale=${activeLocale}`).catch(() => null),
          api.get(`/v1/supplier/stores?locale=${activeLocale}`).catch(() => null),
        ]);
        if (!active) return;

        if (bootRes.status === 403 || profileRes.status === 403) {
          setIsForbidden(true);
          setLoading(false);
          return;
        }

        if (!bootRes.ok || !profileRes.ok) {
          setError(copy.common.error);
          setLoading(false);
          return;
        }

        setBootstrap(await bootRes.json() as BootstrapPayload);
        const profile = await profileRes.json() as { supplier: Supplier };
        setSupplier(profile.supplier);
        setProfileName(profile.supplier.name);
        setProfileStatus(profile.supplier.status);
        setMarkets((await marketsRes.json() as { items: MarketRecord[] }).items ?? []);
        setLocations((await locationsRes.json() as { items: Location[] }).items ?? []);
        setProducts((await productsRes.json() as { items: Product[] }).items ?? []);
        setOffers((await offersRes.json() as { items: Offer[] }).items ?? []);
        setSnapshots((await inventoryRes.json() as { items: Snapshot[] }).items ?? []);
        if (syncRes && syncRes.ok) setSyncJobs((await syncRes.json() as { items: SyncJob[] }).items ?? []);
        if (retailRes && retailRes.ok) setRetailCapability(await retailRes.json() as RetailCapability);
        if (storesRes && storesRes.ok) setStores((await storesRes.json() as { items: AffiliatedStore[] }).items ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : copy.common.error);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [activeLocale, authState.isAuthenticated, currentPath, api, copy.common.error]);

  // ─── Action helpers ───────────────────────────────────────────────────────

  function flashSuccess(msg: string) {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  }

  async function handleCreateProduct() {
    const categoryIds = productForm.categoryIds
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const res = await api.post(`/v1/supplier/products?locale=${activeLocale}`, {
      slug: productForm.slug,
      supplier_code: productForm.supplierCode,
      status: productForm.status,
      sku_code: productForm.skuCode,
      barcode: productForm.barcode,
      translations: [
        { locale: 'en', name: productForm.nameEn, description: productForm.descriptionEn },
        { locale: 'ar', name: productForm.nameAr, description: productForm.descriptionAr },
      ],
      category_ids: categoryIds,
    });
    if (res.ok) {
      const created = await res.json() as { product: { id: string }, supplier_product: Product };
      if (productForm.skuCode.trim()) {
        const variantRes = await api.post(`/v1/supplier/products/${created.product.id}/variants?locale=${activeLocale}`, {
          code: 'default',
          status: 'active',
        });
        if (variantRes.ok) {
          const variant = await variantRes.json() as { id: string };
          await api.post(`/v1/supplier/products/${created.product.id}/variants/${variant.id}/skus?locale=${activeLocale}`, {
            code: productForm.skuCode,
            barcode: productForm.barcode,
            status: 'active',
          });
        }
      }
      setProducts(prev => [created.supplier_product, ...prev]);
      setShowProductDialog(false);
      setProductForm({ slug: '', supplierCode: '', status: 'active', nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '', skuCode: '', barcode: '', categoryIds: '' });
      flashSuccess(copy.common.success);
    }
  }

  async function handleCreateOffer() {
    const moqValue = parseInt(offerForm.moq, 10) || 1;
    const res = await api.post(`/v1/supplier/offers?locale=${activeLocale}`, {
      supplier_product_id: offerForm.supplierProductId,
      supplier_market_id: offerForm.supplierMarketId,
      market_code: offerForm.marketCode,
      status: offerForm.status,
      price: { amount_minor: Math.round(parseFloat(offerForm.wholesalePrice) * 100), currency: offerForm.currency },
      min_order_quantity: moqValue,
      is_available: true,
    });
    if (res.ok) {
      const created = await res.json() as Offer;
      setOffers(prev => [created, ...prev]);
      setShowOfferDialog(false);
      setOfferForm({ supplierProductId: '', supplierMarketId: '', marketCode: '', status: 'active', wholesalePrice: '', currency: 'EGP', moq: '1' });
      flashSuccess(copy.common.success);
    }
  }

  async function handleAdjustInventory() {
    if (!selectedSnapshotId) return;
    const res = await api.post(`/v1/supplier/inventory/${selectedSnapshotId}/adjustments?locale=${activeLocale}`, {
      quantity_delta: parseInt(adjustForm.quantityDelta, 10),
      movement_type: adjustForm.movementType,
      reason: adjustForm.reason,
    });
    if (res.ok) {
      const result = await res.json() as { snapshot: Snapshot; movement: Movement };
      setSnapshots(prev => prev.map(s => s.id === selectedSnapshotId ? result.snapshot : s));
      setMovements(prev => [result.movement, ...prev]);
      setShowAdjustDialog(false);
      setAdjustForm({ quantityDelta: '0', reason: '', movementType: 'adjustment' });
      flashSuccess(copy.common.success);
    }
  }

  async function handleLoadMovements(snapshotId: string) {
    setSelectedSnapshotId(snapshotId);
    setInventoryTab('movements');
    const res = await api.get(`/v1/supplier/inventory/${snapshotId}/movements?locale=${activeLocale}`);
    if (res.ok) {
      setMovements((await res.json() as { items: Movement[] }).items ?? []);
    }
  }

  async function handleCreateLocation() {
    const res = await api.post(`/v1/supplier/locations?locale=${activeLocale}`, {
      supplier_market_id: locationForm.supplierMarketId,
      market_code: locationForm.marketCode,
      code: locationForm.code,
      name: locationForm.name,
      location_type: locationForm.locationType,
      status: locationForm.status,
    });
    if (res.ok) {
      const created = await res.json() as Location;
      setLocations(prev => [created, ...prev]);
      setShowLocationDialog(false);
      setLocationForm({ supplierMarketId: '', marketCode: '', code: '', name: '', locationType: 'warehouse', status: 'active' });
      flashSuccess(copy.common.success);
    }
  }

  async function handleTriggerSync() {
    const res = await api.post(`/v1/supplier/integrations/sync-jobs?locale=${activeLocale}`, {
      connection_id: 'default_supplier_connector',
    });
    if (res.ok) {
      const job = await res.json() as SyncJob;
      setSyncJobs(prev => [job, ...prev]);
      flashSuccess(copy.common.success);
    }
  }

  async function handleProvisionRetail() {
    const res = await api.post(`/v1/supplier/retail-capability?locale=${activeLocale}`, {
      code: retailProvisionForm.code,
      name: retailProvisionForm.name,
    });
    if (res.ok) {
      setRetailCapability(await res.json() as RetailCapability);
      setShowRetailProvisionDialog(false);
      setRetailProvisionForm({ code: '', name: '' });
      flashSuccess(copy.common.success);
    }
  }

  async function handleCreateStore() {
    const res = await api.post(`/v1/supplier/stores?locale=${activeLocale}`, {
      market_code: createStoreForm.marketCode,
      code: createStoreForm.code,
      name: createStoreForm.name,
    });
    if (res.ok) {
      const created = await res.json() as AffiliatedStore;
      setStores(prev => [created, ...prev]);
      setShowCreateStoreDialog(false);
      setCreateStoreForm({ marketCode: '', code: '', name: '' });
      flashSuccess(copy.common.success);
    }
  }

  async function handleMediaUpload(productId: string, file: File) {
    const res = await api.post(`/v1/supplier/products/${productId}/media?locale=${activeLocale}`, {
      media_type: file.type || 'image/jpeg',
      uri: URL.createObjectURL(file),
      alt_text: file.name,
      sort_order: mediaItems.length,
      storage_key: `supplier/${productId}/${file.name}`,
      is_primary: mediaItems.length === 0,
    });
    if (res.ok) {
      const media = await res.json() as MediaItem;
      setMediaItems(prev => [...prev, media]);
    }
  }

  async function handleMediaDelete(productId: string, mediaId: string) {
    const res = await api.delete(`/v1/supplier/products/${productId}/media/${mediaId}?locale=${activeLocale}`);
    if (res && res.ok) {
      setMediaItems(prev => prev.filter(m => m.id !== mediaId));
    }
  }

  async function handleSetPrimaryMedia(productId: string, mediaId: string) {
    const res = await api.put(`/v1/supplier/products/${productId}/media/${mediaId}?locale=${activeLocale}`, {
      alt_text: '',
      sort_order: 0,
      is_primary: true,
    });
    if (res.ok) {
      setMediaItems(prev => prev.map(m => ({ ...m, is_primary: m.id === mediaId })));
    }
  }

  async function handleSaveSettings() {
    const res = await api.put(`/v1/supplier/profile?locale=${activeLocale}`, {
      name: profileName,
      status: profileStatus,
      settings: JSON.parse(profileSettings || '{}'),
    });
    if (res.ok) {
      setSupplier(prev => prev ? { ...prev, name: profileName, status: profileStatus } : prev);
      flashSuccess(copy.common.success);
    }
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  function navigate(path: string) {
    setCurrentPath(path);
    window.history.pushState({}, '', path);
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  function renderDashboard() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{copy.nav.dashboard}</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <Card variant="glass">
            <CardContent>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{copy.kpi.totalProducts}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{products.length}</div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{copy.kpi.activeOffers}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{offers.filter(o => o.status === 'active').length}</div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{copy.kpi.pendingSync}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{syncJobs.filter(j => j.status === 'queued' || j.status === 'processing').length}</div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{copy.kpi.totalLocations}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{locations.length}</div>
            </CardContent>
          </Card>
        </div>
        <Card variant="glass">
          <CardContent>
            <div style={{ fontWeight: 600 }}>{supplier?.name ?? '—'}</div>
            <Badge variant={supplier?.status === 'active' ? 'success' : 'warning'}>{supplier?.status ?? '—'}</Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderProducts() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{copy.products.title}</h1>
          <Button onClick={() => setShowProductDialog(true)}>{copy.products.addProduct}</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.products.slug}</TableHead>
              <TableHead>{copy.products.supplierCode}</TableHead>
              <TableHead>{copy.products.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.slug}</TableCell>
                <TableCell>{p.supplier_code ?? '—'}</TableCell>
                <TableCell><Badge variant={p.status === 'active' ? 'success' : 'secondary'}>{p.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog isOpen={showProductDialog} onClose={() => setShowProductDialog(false)} title={copy.products.addProduct}
          footer={<><Button onClick={() => void handleCreateProduct()}>{copy.products.save}</Button><Button onClick={() => setShowProductDialog(false)}>{copy.products.cancel}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input label={copy.products.slug} value={productForm.slug} onChange={e => setProductForm(f => ({ ...f, slug: e.target.value }))} />
            <Input label={copy.products.supplierCode} value={productForm.supplierCode} onChange={e => setProductForm(f => ({ ...f, supplierCode: e.target.value }))} />
            <Input label={copy.products.nameEn} value={productForm.nameEn} onChange={e => setProductForm(f => ({ ...f, nameEn: e.target.value }))} />
            <Input label={copy.products.nameAr} value={productForm.nameAr} onChange={e => setProductForm(f => ({ ...f, nameAr: e.target.value }))} />
            <Input label={copy.products.descriptionEn} value={productForm.descriptionEn} onChange={e => setProductForm(f => ({ ...f, descriptionEn: e.target.value }))} />
            <Input label={copy.products.descriptionAr} value={productForm.descriptionAr} onChange={e => setProductForm(f => ({ ...f, descriptionAr: e.target.value }))} />
            <Input label={copy.products.categories} value={productForm.categoryIds} onChange={e => setProductForm(f => ({ ...f, categoryIds: e.target.value }))} />
            <div style={{ fontWeight: 600, marginTop: '8px' }}>{copy.products.variantsSection}</div>
            <Input label={copy.products.skuCodeLabel} value={productForm.skuCode} onChange={e => setProductForm(f => ({ ...f, skuCode: e.target.value }))} />
            <Input label={copy.products.barcodeLabel} value={productForm.barcode} onChange={e => setProductForm(f => ({ ...f, barcode: e.target.value }))} />
            <div style={{ fontWeight: 600, marginTop: '8px' }}>{copy.products.mediaSection}</div>
            <input type="file" accept="image/*"
              onChange={e => { if (e.target.files?.[0] && products[0]?.id) void handleMediaUpload(products[0].id, e.target.files[0]); }}
              aria-label={copy.products.addMedia} />
            {mediaItems.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {mediaItems.map(m => (
                  <div key={m.id} style={{ position: 'relative', width: '80px' }}>
                    <img src={m.url} alt={copy.products.mediaSection} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: m.is_primary ? '2px solid #10b981' : '1px solid #e5e7eb' }} />
                    <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                      {!m.is_primary && <button style={{ fontSize: '0.7rem' }} onClick={() => products[0]?.id && void handleSetPrimaryMedia(products[0].id, m.id)}>{copy.products.setPrimary}</button>}
                      <button style={{ fontSize: '0.7rem', color: '#ef4444' }} onClick={() => products[0]?.id && void handleMediaDelete(products[0].id, m.id)}>{copy.products.deleteMedia}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog>
      </div>
    );
  }

  function renderOffers() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{copy.offers.title}</h1>
          <Button onClick={() => setShowOfferDialog(true)}>{copy.offers.addOffer}</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.offers.marketCode}</TableHead>
              <TableHead>{copy.offers.wholesalePrice}</TableHead>
              <TableHead>{copy.offers.moq}</TableHead>
              <TableHead>{copy.offers.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.map(o => (
              <TableRow key={o.id}>
                <TableCell>{o.market_code}</TableCell>
                <TableCell>{o.price ? `${(o.price.amount_minor / 100).toFixed(2)} ${o.price.currency}` : '—'}</TableCell>
                <TableCell>{o.min_order_quantity ?? '—'}</TableCell>
                <TableCell><Badge variant={o.status === 'active' ? 'success' : 'secondary'}>{o.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog isOpen={showOfferDialog} onClose={() => setShowOfferDialog(false)} title={copy.offers.addOffer}
          footer={<><Button onClick={() => void handleCreateOffer()}>{copy.offers.save}</Button><Button onClick={() => setShowOfferDialog(false)}>{copy.offers.cancel}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input label={copy.offers.productId} value={offerForm.supplierProductId} onChange={e => setOfferForm(f => ({ ...f, supplierProductId: e.target.value }))} />
            <Input label={copy.offers.marketId} value={offerForm.supplierMarketId} onChange={e => setOfferForm(f => ({ ...f, supplierMarketId: e.target.value }))} />
            <Input label={copy.offers.marketCode} value={offerForm.marketCode} onChange={e => setOfferForm(f => ({ ...f, marketCode: e.target.value }))} />
            <Input label={copy.offers.wholesalePrice} value={offerForm.wholesalePrice} onChange={e => setOfferForm(f => ({ ...f, wholesalePrice: e.target.value }))} type="number" />
            <Input label={copy.offers.currency} value={offerForm.currency} onChange={e => setOfferForm(f => ({ ...f, currency: e.target.value }))} />
            <Input label={copy.offers.moq} value={offerForm.moq} onChange={e => setOfferForm(f => ({ ...f, moq: e.target.value }))} type="number" />
          </div>
        </Dialog>
      </div>
    );
  }

  function renderInventory() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{copy.inventory.title}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={() => setInventoryTab('snapshots')}>{copy.inventory.snapshotsTab}</Button>
          <Button onClick={() => setInventoryTab('movements')}>{copy.inventory.movementsTab}</Button>
        </div>
        {inventoryTab === 'snapshots' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.inventory.locationId}</TableHead>
                <TableHead>{copy.inventory.skuId}</TableHead>
                <TableHead>{copy.inventory.onHand}</TableHead>
                <TableHead>{copy.inventory.reserved}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{s.fulfillment_location_id}</TableCell>
                  <TableCell>{s.sku_id}</TableCell>
                  <TableCell>{s.on_hand_qty}</TableCell>
                  <TableCell>{s.reserved_qty}</TableCell>
                  <TableCell>
                    <Button onClick={() => { setSelectedSnapshotId(s.id); setShowAdjustDialog(true); }}>
                      {copy.inventory.adjustStock}
                    </Button>
                    <Button onClick={() => void handleLoadMovements(s.id)}>
                      {copy.inventory.movementsTab}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {inventoryTab === 'movements' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.inventory.movementType}</TableHead>
                <TableHead>{copy.inventory.deltaQty}</TableHead>
                <TableHead>{copy.inventory.onHand}</TableHead>
                <TableHead>{copy.inventory.reason}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.movement_type}</TableCell>
                  <TableCell>{m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}</TableCell>
                  <TableCell>{m.on_hand_qty}</TableCell>
                  <TableCell>{m.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog isOpen={showAdjustDialog} onClose={() => setShowAdjustDialog(false)} title={copy.inventory.adjustStock}
          footer={<><Button onClick={() => void handleAdjustInventory()}>{copy.inventory.confirmAdjustment}</Button><Button onClick={() => setShowAdjustDialog(false)}>{copy.inventory.cancel}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input label={copy.inventory.deltaQty} value={adjustForm.quantityDelta} type="number" onChange={e => setAdjustForm(f => ({ ...f, quantityDelta: e.target.value }))} />
            <Input label={copy.inventory.reason} value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} />
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '4px' }}>{copy.inventory.movementType}</label>
              <select value={adjustForm.movementType} onChange={e => setAdjustForm(f => ({ ...f, movementType: e.target.value }))}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                <option value="adjustment">{copy.inventory.movementTypes.adjustment}</option>
                <option value="receipt">{copy.inventory.movementTypes.receipt}</option>
                <option value="shipment">{copy.inventory.movementTypes.shipment}</option>
                <option value="return">{copy.inventory.movementTypes.return}</option>
              </select>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }

  function renderLocations() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{copy.locations.title}</h1>
          <Button onClick={() => setShowLocationDialog(true)}>{copy.locations.addLocation}</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.locations.code}</TableHead>
              <TableHead>{copy.locations.name}</TableHead>
              <TableHead>{copy.locations.marketCode}</TableHead>
              <TableHead>{copy.locations.locationType}</TableHead>
              <TableHead>{copy.locations.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map(l => (
              <TableRow key={l.id}>
                <TableCell>{l.code}</TableCell>
                <TableCell>{l.name}</TableCell>
                <TableCell>{l.market_code}</TableCell>
                <TableCell>{l.location_type}</TableCell>
                <TableCell><Badge variant={l.status === 'active' ? 'success' : 'secondary'}>{l.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog isOpen={showLocationDialog} onClose={() => setShowLocationDialog(false)} title={copy.locations.addLocation}
          footer={<><Button onClick={() => void handleCreateLocation()}>{copy.locations.save}</Button><Button onClick={() => setShowLocationDialog(false)}>{copy.locations.cancel}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input label={copy.locations.marketId} value={locationForm.supplierMarketId} onChange={e => setLocationForm(f => ({ ...f, supplierMarketId: e.target.value }))} />
            <Input label={copy.locations.marketCode} value={locationForm.marketCode} onChange={e => setLocationForm(f => ({ ...f, marketCode: e.target.value }))} />
            <Input label={copy.locations.code} value={locationForm.code} onChange={e => setLocationForm(f => ({ ...f, code: e.target.value }))} />
            <Input label={copy.locations.name} value={locationForm.name} onChange={e => setLocationForm(f => ({ ...f, name: e.target.value }))} />
            <Input label={copy.locations.locationType} value={locationForm.locationType} onChange={e => setLocationForm(f => ({ ...f, locationType: e.target.value }))} />
          </div>
        </Dialog>
      </div>
    );
  }

  function renderIntegrations() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{copy.integrations.title}</h1>
          <Button onClick={() => void handleTriggerSync()}>{copy.integrations.triggerSync}</Button>
        </div>
        {syncJobs.length === 0 && <p style={{ color: '#6b7280' }}>{copy.integrations.noJobs}</p>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.integrations.jobId}</TableHead>
              <TableHead>{copy.integrations.status}</TableHead>
              <TableHead>{copy.integrations.processedItems}</TableHead>
              <TableHead>{copy.integrations.failedItems}</TableHead>
              <TableHead>{copy.integrations.totalItems}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {syncJobs.map(job => (
              <TableRow key={job.id}>
                <TableCell>{job.id}</TableCell>
                <TableCell><Badge variant={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'destructive' : 'warning'}>{job.status}</Badge></TableCell>
                <TableCell>{job.processed_items ?? 0}</TableCell>
                <TableCell>{job.failed_items ?? 0}</TableCell>
                <TableCell>{job.total_items ?? 0}</TableCell>
                <TableCell>
                  {job.status === 'failed' && (
                    <Button onClick={() => void handleTriggerSync()}>{copy.integrations.retryJob}</Button>
                  )}
                  {job.error_summary && (
                    <details><summary style={{ fontSize: '0.8rem', cursor: 'pointer' }}>{copy.integrations.errorSummary}</summary>
                      <pre style={{ fontSize: '0.75rem', padding: '8px', background: '#fef2f2', borderRadius: '4px' }}>{job.error_summary}</pre>
                    </details>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  function renderRetail() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{copy.retail.title}</h1>
        <Card variant="glass">
          <CardContent>
            {retailCapability ? (
              <div>
                <Badge variant="success">{copy.retail.statusProvisioned}</Badge>
                <p style={{ marginTop: '8px' }}>{retailCapability.seller.name} ({retailCapability.seller.code})</p>
              </div>
            ) : (
              <div>
                <Badge variant="warning">{copy.retail.notProvisioned}</Badge>
                <div style={{ marginTop: '12px' }}>
                  <Button onClick={() => setShowRetailProvisionDialog(true)}>{copy.retail.provisionBtn}</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {retailCapability && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{copy.retail.storesList}</h2>
              <Button onClick={() => setShowCreateStoreDialog(true)}>{copy.retail.createStoreBtn}</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.retail.storeCode}</TableHead>
                  <TableHead>{copy.retail.storeName}</TableHead>
                  <TableHead>{copy.retail.marketCode}</TableHead>
                  <TableHead>{copy.products.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.market_code}</TableCell>
                    <TableCell><Badge variant={s.status === 'active' ? 'success' : 'secondary'}>{s.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        <Dialog isOpen={showRetailProvisionDialog} onClose={() => setShowRetailProvisionDialog(false)} title={copy.retail.provisionBtn}
          footer={<><Button onClick={() => void handleProvisionRetail()}>{copy.retail.save}</Button><Button onClick={() => setShowRetailProvisionDialog(false)}>{copy.retail.cancel}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input label={copy.retail.storeCode} value={retailProvisionForm.code} onChange={e => setRetailProvisionForm(f => ({ ...f, code: e.target.value }))} />
            <Input label={copy.retail.storeName} value={retailProvisionForm.name} onChange={e => setRetailProvisionForm(f => ({ ...f, name: e.target.value }))} />
          </div>
        </Dialog>

        <Dialog isOpen={showCreateStoreDialog} onClose={() => setShowCreateStoreDialog(false)} title={copy.retail.createStoreBtn}
          footer={<><Button onClick={() => void handleCreateStore()}>{copy.retail.save}</Button><Button onClick={() => setShowCreateStoreDialog(false)}>{copy.retail.cancel}</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input label={copy.retail.marketCode} value={createStoreForm.marketCode} onChange={e => setCreateStoreForm(f => ({ ...f, marketCode: e.target.value }))} />
            <Input label={copy.retail.storeCode} value={createStoreForm.code} onChange={e => setCreateStoreForm(f => ({ ...f, code: e.target.value }))} />
            <Input label={copy.retail.storeName} value={createStoreForm.name} onChange={e => setCreateStoreForm(f => ({ ...f, name: e.target.value }))} />
          </div>
        </Dialog>
      </div>
    );
  }

  function renderSettings() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{copy.settings.title}</h1>
        <Card variant="glass">
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>
              <Input label={copy.settings.supplierName} value={profileName} onChange={e => setProfileName(e.target.value)} />
              <Input label={copy.settings.status} value={profileStatus} onChange={e => setProfileStatus(e.target.value)} />
              <Input label={copy.settings.advancedSettings} value={profileSettings} onChange={e => setProfileSettings(e.target.value)} />
              <Button onClick={() => void handleSaveSettings()}>{copy.settings.save}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderCurrentView() {
    const path = currentPath;
    if (path === '/products') return renderProducts();
    if (path === '/offers') return renderOffers();
    if (path === '/inventory') return renderInventory();
    if (path === '/locations') return renderLocations();
    if (path === '/integrations') return renderIntegrations();
    if (path === '/retail') return renderRetail();
    if (path === '/settings') return renderSettings();
    return renderDashboard();
  }

  if (currentPath === '/auth/callback') {
    if (isCallbackProcessing) {
      return <LoadingState title={copy.common.loading} />;
    }
    if (callbackError || authState.error) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '24px' }}>
          <Card variant="glass" style={{ maxWidth: '420px', width: '100%' }}>
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              <CardTitle>{copy.appName}</CardTitle>
              <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
                {callbackError || authState.error}
              </div>
              <Button onClick={() => void activeAuthClient.login('/')}>
                {activeLocale === 'ar' ? 'تسجيل الدخول' : 'Log In'}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  if (!authState.isAuthenticated) {
    if (authState.isLoading) {
      return <LoadingState title={copy.common.loading} />;
    }
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '24px', background: '#f9fafb' }}>
        <Card variant="glass" style={{ maxWidth: '420px', width: '100%' }}>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <CardTitle>{copy.appName}</CardTitle>
            <p style={{ color: '#4b5563', fontSize: '0.95rem' }}>
              {activeLocale === 'ar' ? 'يرجى تسجيل الدخول للوصول إلى لوحة المورد' : 'Please log in to access the supplier portal.'}
            </p>
            {authState.error && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem' }}>
                {authState.error}
              </div>
            )}
            <Button onClick={() => void activeAuthClient.login(currentPath)}>
              {activeLocale === 'ar' ? 'تسجيل الدخول عبر Zitadel' : 'Log In with Zitadel'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout
      appTitle={copy.appName}
      navItems={navItems}
      currentPath={currentPath}
      onNavigate={navigate}
      workspaces={[{ id: 'supplier-main', name: supplier?.name || 'Main Catalog', type: 'supplier' }]}
      user={{
        name: authState.user?.preferred_username || bootstrap?.principal?.preferred_username || 'Supplier Admin',
        email: authState.user?.email || 'supplier@matjerhub.com',
        role: 'Supplier Admin',
      }}
      onSignOut={() => void activeAuthClient.logout()}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
        {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
        {actionSuccess && (
          <div role="status" style={{ padding: '12px 16px', background: '#d1fae5', borderRadius: '8px', color: '#065f46', fontWeight: 500 }}>
            {actionSuccess}
          </div>
        )}
        {isForbidden ? (
          <Card variant="glass">
            <CardContent style={{ textAlign: 'center', padding: '32px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>
                {activeLocale === 'ar' ? '403 - غير مصرح' : '403 Forbidden'}
              </h2>
              <p style={{ marginTop: '8px', color: '#4b5563' }}>
                {activeLocale === 'ar' ? 'ليس لديك صلاحية للوصول إلى هذا المورد.' : 'You do not have permission to access this resource.'}
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          <LoadingState title={copy.common.loading} />
        ) : (
          renderCurrentView()
        )}
      </div>
    </DashboardLayout>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
