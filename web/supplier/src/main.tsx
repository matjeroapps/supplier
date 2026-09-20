import React from 'react';
import { createRoot } from 'react-dom/client';
import { createApiClient } from './lib/api';
import { directionFor, messages, type Locale } from './i18n/locales';
import '@matjerhub/ui-sdk/styles.css';
import {
  DashboardLayout,
  LoadingState,
  ErrorState,
  Card,
  CardTitle,
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Dialog,
  type NavItem,
} from '@matjerhub/ui-sdk';
import './styles.css';

// --- Domain & API Types ---
export type Market = { code: string; country: { name: string }; currency: { code: string } };
export type SupplierBootstrap = {
  actor: string;
  direction: 'rtl' | 'ltr';
  principal?: { subject: string; preferred_username?: string };
  markets: Market[];
};

export type Supplier = { id: string; code: string; name: string; status: string };
export type MarketRecord = { id: string; market_code: string; status: string };
export type Location = { id: string; code: string; name: string; market_code: string; location_type: string; status: string };
export type Product = { id: string; slug: string; status: string; supplier_code?: string; title?: string };
export type Offer = {
  id: string;
  supplier_product_id?: string;
  market_code: string;
  status: string;
  supplier_code?: string;
  wholesale_price?: { amount_minor: number; currency: string };
  available_qty?: number;
  min_order_quantity?: number;
};
export type Snapshot = { id: string; fulfillment_location_id: string; sku_id: string; on_hand_qty: number; reserved_qty: number; version: number };
export type Movement = { id: string; movement_type: string; quantity_delta: number; on_hand_qty: number; reserved_qty: number; reason?: string; created_at: string };
export type SyncJob = { id: string; connection_id: string; supplier_id: string; status: string; total_items: number; processed_items: number; failed_items: number; error_summary?: string };
export type RetailCapability = { affiliation: { supplier_id: string; seller_id: string }; seller: { id: string; code: string; name: string; status: string } };
export type RetailStore = { id: string; seller_id: string; market_code: string; code: string; name: string; status: string };

const locale = (new URLSearchParams(window.location.search).get('locale') === 'ar' ? 'ar' : 'en') satisfies Locale;
const copy = messages[locale];
const api = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? window.location.origin });
document.documentElement.lang = locale;
document.documentElement.dir = directionFor(locale);

export function App() {
  const [bootstrap, setBootstrap] = React.useState<SupplierBootstrap | null>(null);
  const [supplier, setSupplier] = React.useState<Supplier | null>(null);
  const [markets, setMarkets] = React.useState<MarketRecord[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [offers, setOffers] = React.useState<Offer[]>([]);
  const [snapshots, setSnapshots] = React.useState<Snapshot[]>([]);
  const [syncJobs, setSyncJobs] = React.useState<SyncJob[]>([]);
  const [retailCap, setRetailCap] = React.useState<RetailCapability | null>(null);
  const [retailStores, setRetailStores] = React.useState<RetailStore[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [currentPath, setCurrentPath] = React.useState(
    !window.location.pathname || window.location.pathname === '/' ? '/dashboard' : window.location.pathname
  );

  // Search & Filter state
  const [productSearch, setProductSearch] = React.useState('');
  const [inventoryTab, setInventoryTab] = React.useState<'snapshots' | 'locations'>('snapshots');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = React.useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = React.useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = React.useState(false);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = React.useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = React.useState<Snapshot | null>(null);

  // Form states
  const [prodForm, setProdForm] = React.useState({
    slug: '',
    supplierCode: '',
    status: 'active',
    nameAr: '',
    descAr: '',
    nameEn: '',
    descEn: '',
    categories: 'cat-electronics,cat-appliances',
    skuCode: '',
    barcode: '',
    initialStock: '100',
    mediaFiles: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300'],
  });

  const [offerForm, setOfferForm] = React.useState({
    supplierProductID: '',
    marketCode: 'EG',
    status: 'active',
    amountMinor: 25000,
    currency: 'EGP',
    availableQty: 100,
    moq: 5,
  });

  const [locForm, setLocForm] = React.useState({
    marketCode: 'EG',
    code: '',
    name: '',
    locationType: 'warehouse',
    status: 'active',
  });

  const [adjustForm, setAdjustForm] = React.useState({
    delta: 10,
    movementType: 'adjustment',
    reason: 'Routine stock reconciliation',
  });

  const [retailForm, setRetailForm] = React.useState({
    code: '',
    name: '',
  });

  const [profileName, setProfileName] = React.useState('');
  const [profileStatus, setProfileStatus] = React.useState('active');
  const [profileSettings, setProfileSettings] = React.useState('{"tone":"stable","auto_settle":true}');

  const navItems: NavItem[] = [
    { id: 'dashboard', label: copy.nav.dashboard, icon: '📊', path: '/dashboard' },
    { id: 'products', label: copy.nav.products, icon: '📦', path: '/products' },
    { id: 'offers', label: copy.nav.offers, icon: '🏷️', path: '/offers' },
    { id: 'inventory', label: copy.nav.inventory, icon: '🏭', path: '/inventory' },
    { id: 'integrations', label: copy.nav.integrations, icon: '🔄', path: '/integrations' },
    { id: 'retail', label: copy.nav.retail, icon: '🏪', path: '/retail' },
    { id: 'settings', label: copy.nav.settings, icon: '⚙️', path: '/settings' },
  ];

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [bootRes, profileRes, marketsRes, locationsRes, productsRes, offersRes, inventoryRes, syncRes, retailRes, storesRes] = await Promise.all([
        api.get(`/v1/bootstrap?locale=${locale}`),
        api.get(`/v1/supplier/profile?locale=${locale}`),
        api.get(`/v1/supplier/markets?locale=${locale}`),
        api.get(`/v1/supplier/locations?locale=${locale}`),
        api.get(`/v1/supplier/products?locale=${locale}`),
        api.get(`/v1/supplier/offers?locale=${locale}`),
        api.get(`/v1/supplier/inventory?locale=${locale}`),
        api.get(`/v1/supplier/integrations/sync-jobs?locale=${locale}`).catch(() => null),
        api.get(`/v1/supplier/retail-capability?locale=${locale}`).catch(() => null),
        api.get(`/v1/supplier/stores?locale=${locale}`).catch(() => null),
      ]);

      setBootstrap(await bootRes.json());
      const profile = (await profileRes.json()) as { supplier: Supplier; settings?: Record<string, any> };
      setSupplier(profile.supplier);
      setProfileName(profile.supplier.name);
      setProfileStatus(profile.supplier.status);
      if (profile.settings) setProfileSettings(JSON.stringify(profile.settings));

      setMarkets(((await marketsRes.json()) as { items: MarketRecord[] }).items || []);
      setLocations(((await locationsRes.json()) as { items: Location[] }).items || []);
      const prodData = ((await productsRes.json()) as { items: Product[] }).items || [];
      setProducts(prodData);
      if (prodData.length > 0 && !offerForm.supplierProductID) {
        setOfferForm((prev) => ({ ...prev, supplierProductID: prodData[0].id }));
      }
      setOffers(((await offersRes.json()) as { items: Offer[] }).items || []);
      const snpData = ((await inventoryRes.json()) as { items: Snapshot[] }).items || [];
      setSnapshots(snpData);

      if (syncRes && syncRes.ok) {
        setSyncJobs(((await syncRes.json()) as { items: SyncJob[] }).items || []);
      }
      if (retailRes && retailRes.ok) {
        setRetailCap(await retailRes.json());
      }
      if (storesRes && storesRes.ok) {
        setRetailStores(((await storesRes.json()) as { items: RetailStore[] }).items || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.common.error);
    } finally {
      setLoading(false);
    }
  }, [offerForm.supplierProductID]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  // Product actions
  async function handleCreateProduct() {
    try {
      setError(null);
      const res = await api.post(`/v1/supplier/products?locale=${locale}`, {
        slug: prodForm.slug.trim() || `prod-${Date.now()}`,
        status: prodForm.status,
        supplier_code: prodForm.supplierCode.trim() || `SKU-SUP-${Date.now()}`,
        translations: [
          { locale: 'ar', name: prodForm.nameAr || 'منتج جملة', description: prodForm.descAr || 'وصف منتج الجملة' },
          { locale: 'en', name: prodForm.nameEn || 'Wholesale Product', description: prodForm.descEn || 'Wholesale product description' },
        ],
        category_ids: prodForm.categories.split(',').map((c) => c.trim()).filter(Boolean),
      });

      if (!res.ok) throw new Error('Failed to create product');
      setIsProductModalOpen(false);
      setActionSuccess(copy.common.success);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.common.error);
    }
  }

  // Offer actions
  async function handleCreateOffer() {
    try {
      setError(null);
      const targetMarket = markets.find((m) => m.market_code === offerForm.marketCode) || markets[0];
      const res = await api.post(`/v1/supplier/offers?locale=${locale}`, {
        supplier_product_id: offerForm.supplierProductID || (products[0] && products[0].id) || 'prod-1',
        supplier_market_id: targetMarket?.id || 'mkt-1',
        market_code: offerForm.marketCode,
        status: offerForm.status,
        price: {
          amount_minor: Number(offerForm.amountMinor),
          currency: offerForm.currency,
        },
        is_available: true,
        available_qty: Number(offerForm.availableQty),
      });

      if (!res.ok) throw new Error('Failed to create offer');
      setIsOfferModalOpen(false);
      setActionSuccess(copy.common.success);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.common.error);
    }
  }

  // Location actions
  async function handleCreateLocation() {
    try {
      setError(null);
      const targetMarket = markets.find((m) => m.market_code === locForm.marketCode) || markets[0];
      const res = await api.post(`/v1/supplier/locations?locale=${locale}`, {
        supplier_market_id: targetMarket?.id || 'mkt-1',
        market_code: locForm.marketCode,
        code: locForm.code.trim() || `LOC-${Date.now()}`,
        name: locForm.name.trim() || 'Fulfillment Hub',
        location_type: locForm.locationType,
        status: locForm.status,
      });

      if (!res.ok) throw new Error('Failed to create location');
      setIsLocationModalOpen(false);
      setActionSuccess(copy.common.success);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.common.error);
    }
  }

  // Inventory adjustment action
  async function handleAdjustInventory() {
    if (!selectedSnapshot) return;
    try {
      setError(null);
      const res = await api.post(`/v1/supplier/inventory/${selectedSnapshot.id}/adjustments?locale=${locale}`, {
        quantity_delta: Number(adjustForm.delta),
        movement_type: adjustForm.movementType,
        reason: adjustForm.reason,
      });

      if (!res.ok) throw new Error('Failed to adjust inventory');
      setIsAdjustModalOpen(false);
      setActionSuccess(copy.common.success);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.common.error);
    }
  }

  // Sync action
  async function handleTriggerSync() {
    try {
      setError(null);
      const res = await api.post(`/v1/supplier/integrations/sync-jobs?locale=${locale}`, {
        connection_id: 'default_supplier_connector',
      });
      if (res.ok) {
        const job = (await res.json()) as SyncJob;
        setSyncJobs((prev) => [job, ...prev]);
        setActionSuccess(copy.common.success);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.common.error);
    }
  }

  // Retail Provisioning action
  async function handleProvisionRetail() {
    try {
      setError(null);
      const res = await api.post(`/v1/supplier/retail-capability?locale=${locale}`, {
        code: retailForm.code.trim() || `ret-${Date.now()}`,
        name: retailForm.name.trim() || `${supplier?.name || 'Supplier'} Retail Store`,
        settings: { direct_retail: true },
      });
      if (!res.ok) throw new Error('Failed to provision retail capability');
      setIsProvisionModalOpen(false);
      setActionSuccess(copy.common.success);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.common.error);
    }
  }

  // Profile update action
  async function handleSaveProfile() {
    try {
      setError(null);
      const res = await api.put(`/v1/supplier/profile?locale=${locale}`, {
        name: profileName,
        status: profileStatus,
        settings: JSON.parse(profileSettings || '{}'),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      setActionSuccess(copy.common.success);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.common.error);
    }
  }

  const filteredProducts = products.filter((p) =>
    (p.slug || '').toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.supplier_code || '').toLowerCase().includes(productSearch.toLowerCase())
  );

  const totalStockCount = snapshots.reduce((acc, s) => acc + (s.on_hand_qty || 0), 0);

  return (
    <DashboardLayout
      appTitle={copy.appName}
      navItems={navItems}
      currentPath={currentPath}
      onNavigate={(path: string) => {
        setCurrentPath(path);
        window.history.pushState({}, '', path);
      }}
      workspaces={[{ id: 'supplier-main', name: supplier?.name || 'Wholesale Supply Portal', type: 'supplier' }]}
      user={{
        name: bootstrap?.principal?.preferred_username || 'Supplier Admin',
        email: 'supplier@matjerhub.com',
        role: 'Wholesale Supplier',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && <ErrorState message={error} onRetry={() => void loadData()} />}
        {actionSuccess && (
          <div style={{ background: '#ecfdf5', color: '#065f46', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{actionSuccess}</span>
            <Button variant="ghost" size="sm" onClick={() => setActionSuccess(null)}>✕</Button>
          </div>
        )}
        {loading && <LoadingState title={copy.common.loading} />}

        {/* 1. DASHBOARD VIEW */}
        {currentPath === '/dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <Card variant="default">
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{copy.kpi.totalProducts}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{products.length}</div>
              </Card>
              <Card variant="default">
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{copy.kpi.activeOffers}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px', color: '#059669' }}>{offers.length}</div>
              </Card>
              <Card variant="default">
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{copy.kpi.totalStock}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px', color: '#2563eb' }}>{totalStockCount}</div>
              </Card>
              <Card variant="default">
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{copy.kpi.syncJobs}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{syncJobs.length}</div>
              </Card>
            </div>

            <Card variant="glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <CardTitle>{supplier?.name || copy.appName}</CardTitle>
                  <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>{copy.products.subtitle}</p>
                </div>
                {supplier && <Badge variant="success">{supplier.code}</Badge>}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <Button variant="primary" onClick={() => setIsProductModalOpen(true)}>+ {copy.products.addProduct}</Button>
                <Button variant="secondary" onClick={() => setIsOfferModalOpen(true)}>+ {copy.offers.addOffer}</Button>
                <Button variant="outline" onClick={() => void handleTriggerSync()}>🔄 {copy.integrations.triggerSync}</Button>
              </div>
            </Card>
          </div>
        )}

        {/* 2. PRODUCTS & AUTHORING VIEW */}
        {currentPath === '/products' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{copy.products.title}</h2>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0' }}>{copy.products.subtitle}</p>
              </div>
              <Button variant="primary" onClick={() => setIsProductModalOpen(true)}>+ {copy.products.addProduct}</Button>
            </div>

            <Card variant="default">
              <div style={{ marginBottom: '16px', maxWidth: '350px' }}>
                <Input
                  placeholder={copy.products.searchPlaceholder}
                  value={productSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProductSearch(e.target.value)}
                />
              </div>

              {filteredProducts.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>{copy.products.noProducts}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{copy.products.tableSlug}</TableHead>
                      <TableHead>{copy.products.tableSupplierCode}</TableHead>
                      <TableHead>{copy.products.tableStatus}</TableHead>
                      <TableHead>{copy.products.tableActions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell><strong>{p.slug}</strong></TableCell>
                        <TableCell>{p.supplier_code || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === 'active' ? 'success' : 'outline'}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => {
                            setOfferForm((prev) => ({ ...prev, supplierProductID: p.id }));
                            setIsOfferModalOpen(true);
                          }}>
                            {copy.offers.addOffer}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        )}

        {/* 3. MARKET OFFERS VIEW */}
        {currentPath === '/offers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{copy.offers.title}</h2>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0' }}>{copy.offers.subtitle}</p>
              </div>
              <Button variant="primary" onClick={() => setIsOfferModalOpen(true)}>+ {copy.offers.addOffer}</Button>
            </div>

            <Card variant="default">
              {offers.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>{copy.offers.noOffers}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{copy.offers.marketCode}</TableHead>
                      <TableHead>{copy.offers.wholesalePrice}</TableHead>
                      <TableHead>{copy.offers.availableQty}</TableHead>
                      <TableHead>{copy.offers.status}</TableHead>
                      <TableHead>{copy.offers.isAvailable}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell><Badge variant="default">{o.market_code}</Badge></TableCell>
                        <TableCell>
                          <strong>{o.wholesale_price ? `${(o.wholesale_price.amount_minor / 100).toFixed(2)} ${o.wholesale_price.currency}` : 'Unpriced'}</strong>
                        </TableCell>
                        <TableCell>{o.available_qty ?? '-'}</TableCell>
                        <TableCell>
                          <Badge variant={o.status === 'active' ? 'success' : 'outline'}>
                            {o.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span style={{ color: '#059669', fontWeight: 600 }}>✓ {copy.common.active}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        )}

        {/* 4. INVENTORY & LOCATIONS VIEW */}
        {currentPath === '/inventory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{copy.inventory.title}</h2>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0' }}>{copy.inventory.subtitle}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={() => setIsLocationModalOpen(true)}>+ {copy.inventory.addLocation}</Button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant={inventoryTab === 'snapshots' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setInventoryTab('snapshots')}
              >
                {copy.inventory.snapshotsTab} ({snapshots.length})
              </Button>
              <Button
                variant={inventoryTab === 'locations' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setInventoryTab('locations')}
              >
                {copy.inventory.locationsTab} ({locations.length})
              </Button>
            </div>

            {inventoryTab === 'snapshots' && (
              <Card variant="default">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Snapshot ID</TableHead>
                      <TableHead>SKU ID</TableHead>
                      <TableHead>{copy.inventory.onHandQty}</TableHead>
                      <TableHead>{copy.inventory.reservedQty}</TableHead>
                      <TableHead>{copy.inventory.availableQty}</TableHead>
                      <TableHead>{copy.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshots.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell><code style={{ fontSize: '12px' }}>{s.id.slice(0, 8)}...</code></TableCell>
                        <TableCell><code>{s.sku_id}</code></TableCell>
                        <TableCell><strong style={{ color: '#111827' }}>{s.on_hand_qty}</strong></TableCell>
                        <TableCell><span style={{ color: '#b91c1c' }}>{s.reserved_qty}</span></TableCell>
                        <TableCell><strong style={{ color: '#059669' }}>{s.on_hand_qty - s.reserved_qty}</strong></TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => {
                            setSelectedSnapshot(s);
                            setIsAdjustModalOpen(true);
                          }}>
                            {copy.inventory.adjustStock}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}

            {inventoryTab === 'locations' && (
              <Card variant="default">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{copy.inventory.locationCode}</TableHead>
                      <TableHead>{copy.inventory.locationName}</TableHead>
                      <TableHead>{copy.offers.marketCode}</TableHead>
                      <TableHead>{copy.inventory.locationType}</TableHead>
                      <TableHead>{copy.products.tableStatus}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((loc) => (
                      <TableRow key={loc.id}>
                        <TableCell><strong>{loc.code}</strong></TableCell>
                        <TableCell>{loc.name}</TableCell>
                        <TableCell><Badge variant="outline">{loc.market_code}</Badge></TableCell>
                        <TableCell><Badge variant="default">{loc.location_type}</Badge></TableCell>
                        <TableCell><Badge variant="success">{loc.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        )}

        {/* 5. INTEGRATIONS & SYNC VIEW */}
        {currentPath === '/integrations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{copy.integrations.title}</h2>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0' }}>{copy.integrations.subtitle}</p>
              </div>
              <Button variant="primary" onClick={() => void handleTriggerSync()}>🔄 {copy.integrations.triggerSync}</Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <Card variant="glass">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold' }}>Salla Connector</div>
                  <Badge variant="success">Active</Badge>
                </div>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>Sync wholesale catalogs, SKUs and stock balances automatically.</p>
              </Card>
              <Card variant="glass">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold' }}>Shopify Connector</div>
                  <Badge variant="success">Active</Badge>
                </div>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>Direct catalog and order synchronization bridge.</p>
              </Card>
              <Card variant="glass">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold' }}>WooCommerce Connector</div>
                  <Badge variant="outline">Standby</Badge>
                </div>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>Batch product feed ingestion engine.</p>
              </Card>
            </div>

            <Card variant="default">
              <CardTitle>{copy.integrations.recentJobs}</CardTitle>
              {syncJobs.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No sync jobs executed yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{copy.integrations.jobId}</TableHead>
                      <TableHead>{copy.integrations.connector}</TableHead>
                      <TableHead>{copy.integrations.jobStatus}</TableHead>
                      <TableHead>{copy.integrations.processedItems}</TableHead>
                      <TableHead>{copy.integrations.failedItems}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncJobs.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell><code>{j.id.slice(0, 10)}...</code></TableCell>
                        <TableCell>{j.connection_id || 'default'}</TableCell>
                        <TableCell>
                          <Badge variant={j.status === 'completed' ? 'success' : j.status === 'failed' ? 'destructive' : 'default'}>
                            {j.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{j.processed_items || 0} / {j.total_items || 0}</TableCell>
                        <TableCell>{j.failed_items > 0 ? <span style={{ color: '#b91c1c' }}>{j.failed_items}</span> : '0'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        )}

        {/* 6. AFFILIATED RETAIL STORE VIEW (ADR-019) */}
        {currentPath === '/retail' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{copy.retail.title}</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0' }}>{copy.retail.subtitle}</p>
            </div>

            <Card variant="glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <CardTitle>{retailCap ? copy.retail.statusProvisioned : copy.retail.statusNotProvisioned}</CardTitle>
                  <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
                    {retailCap ? `Affiliated Seller: ${retailCap.seller.name} (${retailCap.seller.code})` : 'Provision an affiliated retail seller profile to operate direct consumer retail storefronts.'}
                  </p>
                </div>
                {!retailCap && (
                  <Button variant="primary" onClick={() => setIsProvisionModalOpen(true)}>+ {copy.retail.provisionBtn}</Button>
                )}
              </div>
            </Card>

            {retailCap && (
              <Card variant="default">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <CardTitle>Direct Stores ({retailStores.length})</CardTitle>
                </div>
                {retailStores.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No retail stores created yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{copy.retail.storeCode}</TableHead>
                        <TableHead>{copy.retail.storeName}</TableHead>
                        <TableHead>{copy.offers.marketCode}</TableHead>
                        <TableHead>{copy.products.tableStatus}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {retailStores.map((st) => (
                        <TableRow key={st.id}>
                          <TableCell><strong>{st.code}</strong></TableCell>
                          <TableCell>{st.name}</TableCell>
                          <TableCell><Badge variant="default">{st.market_code}</Badge></TableCell>
                          <TableCell><Badge variant="success">{st.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            )}
          </div>
        )}

        {/* 7. SETTINGS & PROFILE VIEW */}
        {currentPath === '/settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{copy.settings.title}</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0' }}>{copy.settings.subtitle}</p>
            </div>

            <Card variant="glass">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px' }}>
                <Input
                  label={copy.settings.supplierName}
                  value={profileName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileName(e.target.value)}
                />
                <Input
                  label={copy.settings.supplierStatus}
                  value={profileStatus}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileStatus(e.target.value)}
                />
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>
                    {copy.settings.settingsJson}
                  </label>
                  <textarea
                    style={{ width: '100%', minHeight: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'monospace', fontSize: '13px' }}
                    value={profileSettings}
                    onChange={(e) => setProfileSettings(e.target.value)}
                  />
                </div>
                <Button variant="primary" onClick={() => void handleSaveProfile()}>{copy.settings.saveSettings}</Button>
              </div>
            </Card>
          </div>
        )}

        {/* --- MODALS --- */}

        {/* Product Authoring Modal */}
        <Dialog
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title={copy.products.modalTitle}
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsProductModalOpen(false)}>{copy.common.cancel}</Button>
              <Button variant="primary" onClick={() => void handleCreateProduct()}>{copy.products.saveProduct}</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label={copy.products.slugLabel}
                value={prodForm.slug}
                placeholder="e.g. ergonomic-office-chair"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProdForm({ ...prodForm, slug: e.target.value })}
              />
              <Input
                label={copy.products.codeLabel}
                value={prodForm.supplierCode}
                placeholder="e.g. CHAIR-PRO-01"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProdForm({ ...prodForm, supplierCode: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label={copy.products.nameArLabel}
                value={prodForm.nameAr}
                placeholder="كرسي مكتبي مريح"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProdForm({ ...prodForm, nameAr: e.target.value })}
              />
              <Input
                label={copy.products.nameEnLabel}
                value={prodForm.nameEn}
                placeholder="Ergonomic Office Chair"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProdForm({ ...prodForm, nameEn: e.target.value })}
              />
            </div>

            <Input
              label={copy.products.categoriesLabel}
              value={prodForm.categories}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProdForm({ ...prodForm, categories: e.target.value })}
            />

            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600 }}>{copy.products.variantsSection}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <Input
                  label={copy.products.skuCodeLabel}
                  value={prodForm.skuCode}
                  placeholder="SKU-CHAIR-BLK"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProdForm({ ...prodForm, skuCode: e.target.value })}
                />
                <Input
                  label={copy.products.barcodeLabel}
                  value={prodForm.barcode}
                  placeholder="6281000123456"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProdForm({ ...prodForm, barcode: e.target.value })}
                />
                <Input
                  label={copy.products.initialStockLabel}
                  value={prodForm.initialStock}
                  type="number"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProdForm({ ...prodForm, initialStock: e.target.value })}
                />
              </div>
            </div>

            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600 }}>{copy.products.mediaSection}</h4>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {prodForm.mediaFiles.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #d1d5db' }}>
                    <img src={url} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setProdForm({ ...prodForm, mediaFiles: [...prodForm.mediaFiles, `https://picsum.photos/300/300?rand=${Date.now()}`] })}>
                  + {copy.products.addMedia}
                </Button>
              </div>
            </div>
          </div>
        </Dialog>

        {/* Offer Authoring Modal */}
        <Dialog
          isOpen={isOfferModalOpen}
          onClose={() => setIsOfferModalOpen(false)}
          title={copy.offers.modalTitle}
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOfferModalOpen(false)}>{copy.common.cancel}</Button>
              <Button variant="primary" onClick={() => void handleCreateOffer()}>{copy.offers.saveOffer}</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>
                {copy.offers.selectProduct}
              </label>
              <select
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                value={offerForm.supplierProductID}
                onChange={(e) => setOfferForm({ ...offerForm, supplierProductID: e.target.value })}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.slug} ({p.supplier_code || p.id})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  {copy.offers.selectMarket}
                </label>
                <select
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  value={offerForm.marketCode}
                  onChange={(e) => {
                    const m = e.target.value;
                    const cur = m === 'SA' ? 'SAR' : m === 'AE' ? 'AED' : 'EGP';
                    setOfferForm({ ...offerForm, marketCode: m, currency: cur });
                  }}
                >
                  <option value="EG">Egypt (EG - EGP)</option>
                  <option value="SA">Saudi Arabia (SA - SAR)</option>
                  <option value="AE">UAE (AE - AED)</option>
                </select>
              </div>
              <Input
                label={copy.offers.currency}
                value={offerForm.currency}
                disabled
                onChange={() => {}}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label={copy.offers.priceAmount}
                type="number"
                value={offerForm.amountMinor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOfferForm({ ...offerForm, amountMinor: Number(e.target.value) })}
              />
              <Input
                label={copy.offers.availableQty}
                type="number"
                value={offerForm.availableQty}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOfferForm({ ...offerForm, availableQty: Number(e.target.value) })}
              />
            </div>
          </div>
        </Dialog>

        {/* Location Creation Modal */}
        <Dialog
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          title={copy.inventory.addLocation}
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsLocationModalOpen(false)}>{copy.common.cancel}</Button>
              <Button variant="primary" onClick={() => void handleCreateLocation()}>{copy.common.save}</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input
              label={copy.inventory.locationCode}
              value={locForm.code}
              placeholder="WH-CAIRO-01"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocForm({ ...locForm, code: e.target.value })}
            />
            <Input
              label={copy.inventory.locationName}
              value={locForm.name}
              placeholder="Cairo Central Warehouse"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocForm({ ...locForm, name: e.target.value })}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  {copy.offers.marketCode}
                </label>
                <select
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  value={locForm.marketCode}
                  onChange={(e) => setLocForm({ ...locForm, marketCode: e.target.value })}
                >
                  <option value="EG">Egypt (EG)</option>
                  <option value="SA">Saudi Arabia (SA)</option>
                  <option value="AE">UAE (AE)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  {copy.inventory.locationType}
                </label>
                <select
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  value={locForm.locationType}
                  onChange={(e) => setLocForm({ ...locForm, locationType: e.target.value })}
                >
                  <option value="warehouse">Warehouse</option>
                  <option value="store">Store</option>
                </select>
              </div>
            </div>
          </div>
        </Dialog>

        {/* Stock Adjustment Modal */}
        <Dialog
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title={copy.inventory.adjustStock}
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsAdjustModalOpen(false)}>{copy.common.cancel}</Button>
              <Button variant="primary" onClick={() => void handleAdjustInventory()}>{copy.inventory.confirmAdjustment}</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#f3f4f6', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
              Snapshot: <strong>{selectedSnapshot?.id}</strong> (Current Stock: <strong>{selectedSnapshot?.on_hand_qty}</strong>)
            </div>
            <Input
              label={copy.inventory.deltaQty}
              type="number"
              value={adjustForm.delta}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdjustForm({ ...adjustForm, delta: Number(e.target.value) })}
            />
            <Input
              label={copy.inventory.reason}
              value={adjustForm.reason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
            />
          </div>
        </Dialog>

        {/* Retail Provisioning Modal */}
        <Dialog
          isOpen={isProvisionModalOpen}
          onClose={() => setIsProvisionModalOpen(false)}
          title={copy.retail.provisionBtn}
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsProvisionModalOpen(false)}>{copy.common.cancel}</Button>
              <Button variant="primary" onClick={() => void handleProvisionRetail()}>{copy.retail.provisionBtn}</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input
              label={copy.retail.storeCode}
              value={retailForm.code}
              placeholder="store-direct"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRetailForm({ ...retailForm, code: e.target.value })}
            />
            <Input
              label={copy.retail.storeName}
              value={retailForm.name}
              placeholder="Supplier Direct Retail"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRetailForm({ ...retailForm, name: e.target.value })}
            />
          </div>
        </Dialog>
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
