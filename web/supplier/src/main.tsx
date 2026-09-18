import React from 'react';
import { createRoot } from 'react-dom/client';
import { createApiClient } from './lib/api';
import { directionFor, messages, type Locale } from './i18n/locales';
import '@matjerhub/ui-sdk/styles.css';
import {
  DashboardLayout,
  supplierNavigation,
  LoadingState,
  ErrorState,
  Card,
  CardTitle,
  Button,
  Input,
} from '@matjerhub/ui-sdk';
import './styles.css';

type Market = { code: string; country: { name: string }; currency: { code: string } };
type SupplierBootstrap = {
  actor: string;
  direction: 'rtl' | 'ltr';
  principal?: { subject: string; preferred_username?: string };
  markets: Market[];
};

type Supplier = { id: string; code: string; name: string; status: string };
type MarketRecord = { id: string; market_code: string; status: string };
type Location = { id: string; code: string; name: string; market_code: string; location_type: string; status: string };
type Product = { id: string; slug: string; status: string };
type Offer = { id: string; market_code: string; status: string; supplier_code?: string };
type Snapshot = { id: string; fulfillment_location_id: string; sku_id: string; on_hand_qty: number; reserved_qty: number; version: number };
type Movement = { id: string; movement_type: string; quantity_delta: number; on_hand_qty: number; reserved_qty: number; created_at: string };
type SyncJob = { id: string; connection_id: string; supplier_id: string; status: string; total_items: number; processed_items: number; failed_items: number; error_summary?: string };

const locale = (new URLSearchParams(window.location.search).get('locale') === 'ar' ? 'ar' : 'en') satisfies Locale;
const copy = messages[locale];
const api = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? window.location.origin });
document.documentElement.lang = locale;
document.documentElement.dir = directionFor(locale);

function App() {
  const [bootstrap, setBootstrap] = React.useState<SupplierBootstrap | null>(null);
  const [supplier, setSupplier] = React.useState<Supplier | null>(null);
  const [markets, setMarkets] = React.useState<MarketRecord[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [offers, setOffers] = React.useState<Offer[]>([]);
  const [snapshots, setSnapshots] = React.useState<Snapshot[]>([]);
  const [movements, setMovements] = React.useState<Movement[]>([]);
  const [syncJobs, setSyncJobs] = React.useState<SyncJob[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [profileName, setProfileName] = React.useState('');
  const [profileStatus, setProfileStatus] = React.useState('active');
  const [profileSettings, setProfileSettings] = React.useState('{"tone":"stable"}');
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname || '/dashboard');

  React.useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const [bootRes, profileRes, marketsRes, locationsRes, productsRes, offersRes, inventoryRes, syncRes] = await Promise.all([
          api.get(`/v1/bootstrap?locale=${locale}`),
          api.get(`/v1/supplier/profile?locale=${locale}`),
          api.get(`/v1/supplier/markets?locale=${locale}`),
          api.get(`/v1/supplier/locations?locale=${locale}`),
          api.get(`/v1/supplier/products?locale=${locale}`),
          api.get(`/v1/supplier/offers?locale=${locale}`),
          api.get(`/v1/supplier/inventory?locale=${locale}`),
          api.get(`/v1/supplier/integrations/sync-jobs?locale=${locale}`).catch(() => null)
        ]);
        if (!active) return;
        setBootstrap(await bootRes.json());
        const profile = await profileRes.json() as { supplier: Supplier };
        setSupplier(profile.supplier);
        setProfileName(profile.supplier.name);
        setProfileStatus(profile.supplier.status);
        setMarkets((await marketsRes.json() as { items: MarketRecord[] }).items);
        setLocations((await locationsRes.json() as { items: Location[] }).items);
        setProducts((await productsRes.json() as { items: Product[] }).items);
        setOffers((await offersRes.json() as { items: Offer[] }).items);
        setSnapshots((await inventoryRes.json() as { items: Snapshot[] }).items);
        if (syncRes && syncRes.ok) {
          setSyncJobs((await syncRes.json() as { items: SyncJob[] }).items || []);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load supplier dashboard');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function submitProfile() {
    const response = await api.put(`/v1/supplier/profile?locale=${locale}`, {
      name: profileName,
      status: profileStatus,
      settings: JSON.parse(profileSettings || '{}')
    });
    if (!response.ok) throw new Error('Profile update failed');
  }

  async function triggerCatalogSync() {
    const response = await api.post(`/v1/supplier/integrations/sync-jobs?locale=${locale}`, {
      connection_id: 'default_supplier_connector'
    });
    if (response.ok) {
      const job = await response.json() as SyncJob;
      setSyncJobs((prev: SyncJob[]) => [job, ...prev]);
    }
  }

  return (
    <DashboardLayout
      appTitle="MatjerHub Supplier"
      navItems={supplierNavigation}
      currentPath={currentPath}
      onNavigate={(path: string) => {
        setCurrentPath(path);
        window.history.pushState({}, '', path);
      }}
      workspaces={[{ id: 'supplier-main', name: supplier?.name || 'Main Catalog', type: 'supplier' }]}
      user={{
        name: bootstrap?.principal?.preferred_username || 'Supplier User',
        email: 'supplier@matjerhub.com',
        role: 'Supplier Admin',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState title="Loading catalog..." /> : null}

        <Card variant="glass">
          <CardTitle>Supplier Profile</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', maxWidth: '400px' }}>
            <Input label="Supplier Name" value={profileName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileName(e.target.value)} />
            <Input label="Status" value={profileStatus} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileStatus(e.target.value)} />
            <Button onClick={() => void submitProfile()}>Save Profile</Button>
          </div>
        </Card>

        <Card variant="glass">
          <CardTitle>External Platform Integrations & Catalog Sync</CardTitle>
          <div style={{ marginTop: '12px' }}>
            <Button onClick={() => void triggerCatalogSync()}>Trigger Catalog Import Sync</Button>
            {syncJobs.length > 0 && (
              <ul style={{ marginTop: '12px', listStyle: 'none', padding: 0 }}>
                {syncJobs.map((job: SyncJob) => (
                  <li key={job.id} style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    Job <strong>{job.id}</strong> — Status: <em>{job.status}</em> (Processed: {job.processed_items || 0} / {job.total_items || 0})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
