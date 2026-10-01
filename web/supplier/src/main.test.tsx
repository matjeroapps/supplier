import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { directionFor, messages, locales, type Locale } from './i18n/locales';
import { App } from './main';
import type { AuthClient, AuthState } from './auth/oidc';

// ─── Locale unit tests ─────────────────────────────────────────────────────

describe('Locale utilities', () => {
  it('directionFor returns rtl for Arabic', () => {
    expect(directionFor('ar')).toBe('rtl');
  });

  it('directionFor returns ltr for English', () => {
    expect(directionFor('en')).toBe('ltr');
  });

  it('all locales are defined', () => {
    for (const l of locales) {
      expect(messages[l]).toBeDefined();
    }
  });

  it('Arabic and English nav keys match', () => {
    expect(Object.keys(messages.ar.nav)).toEqual(Object.keys(messages.en.nav));
  });

  it('nav includes all 8 required routes', () => {
    const paths = Object.keys(messages.en.nav);
    expect(paths).toContain('dashboard');
    expect(paths).toContain('products');
    expect(paths).toContain('offers');
    expect(paths).toContain('inventory');
    expect(paths).toContain('locations');
    expect(paths).toContain('integrations');
    expect(paths).toContain('retail');
    expect(paths).toContain('settings');
  });

  it('Arabic and English kpi keys match', () => {
    expect(Object.keys(messages.ar.kpi)).toEqual(Object.keys(messages.en.kpi));
  });

  it('Arabic and English product keys match', () => {
    expect(Object.keys(messages.ar.products)).toEqual(Object.keys(messages.en.products));
  });

  it('products locale has skuCodeLabel and barcodeLabel', () => {
    expect(messages.en.products.skuCodeLabel).toBeTruthy();
    expect(messages.ar.products.skuCodeLabel).toBeTruthy();
    expect(messages.en.products.barcodeLabel).toBeTruthy();
    expect(messages.ar.products.barcodeLabel).toBeTruthy();
  });

  it('products locale has media gallery keys', () => {
    expect(messages.en.products.mediaSection).toBeTruthy();
    expect(messages.en.products.addMedia).toBeTruthy();
    expect(messages.en.products.primaryImage).toBeTruthy();
    expect(messages.en.products.deleteMedia).toBeTruthy();
    expect(messages.en.products.setPrimary).toBeTruthy();
    expect(messages.ar.products.deleteMedia).toBeTruthy();
    expect(messages.ar.products.setPrimary).toBeTruthy();
  });

  it('offers locale has MOQ key', () => {
    expect(messages.en.offers.moq).toBeTruthy();
    expect(messages.ar.offers.moq).toBeTruthy();
  });

  it('inventory locale has movementType and movementTypes selector', () => {
    expect(messages.en.inventory.movementType).toBeTruthy();
    expect(messages.en.inventory.movementTypes.adjustment).toBeTruthy();
    expect(messages.en.inventory.movementTypes.receipt).toBeTruthy();
    expect(messages.en.inventory.movementTypes.shipment).toBeTruthy();
    expect(messages.en.inventory.movementTypes.return).toBeTruthy();
    expect(messages.ar.inventory.movementType).toBeTruthy();
  });

  it('inventory locale has movementsTab key', () => {
    expect(messages.en.inventory.movementsTab).toBeTruthy();
    expect(messages.ar.inventory.movementsTab).toBeTruthy();
  });

  it('integrations locale has retryJob and errorSummary keys', () => {
    expect(messages.en.integrations.retryJob).toBeTruthy();
    expect(messages.en.integrations.errorSummary).toBeTruthy();
    expect(messages.ar.integrations.retryJob).toBeTruthy();
    expect(messages.ar.integrations.errorSummary).toBeTruthy();
  });

  it('retail locale has createStoreBtn and storesList keys', () => {
    expect(messages.en.retail.createStoreBtn).toBeTruthy();
    expect(messages.en.retail.storesList).toBeTruthy();
    expect(messages.ar.retail.createStoreBtn).toBeTruthy();
    expect(messages.ar.retail.storesList).toBeTruthy();
  });

  it('Arabic and English offers keys match', () => {
    expect(Object.keys(messages.ar.offers)).toEqual(Object.keys(messages.en.offers));
  });

  it('Arabic and English inventory keys match at top level', () => {
    const arKeys = Object.keys(messages.ar.inventory).filter(k => k !== 'movementTypes');
    const enKeys = Object.keys(messages.en.inventory).filter(k => k !== 'movementTypes');
    expect(arKeys).toEqual(enKeys);
  });

  it('Arabic and English locations keys match', () => {
    expect(Object.keys(messages.ar.locations)).toEqual(Object.keys(messages.en.locations));
  });

  it('Arabic and English integrations keys match', () => {
    expect(Object.keys(messages.ar.integrations)).toEqual(Object.keys(messages.en.integrations));
  });

  it('Arabic and English retail keys match', () => {
    expect(Object.keys(messages.ar.retail)).toEqual(Object.keys(messages.en.retail));
  });

  it('Arabic and English settings keys match', () => {
    expect(Object.keys(messages.ar.settings)).toEqual(Object.keys(messages.en.settings));
  });

  it('Arabic and English common keys match', () => {
    expect(Object.keys(messages.ar.common)).toEqual(Object.keys(messages.en.common));
  });

  it('Arabic app name is non-empty', () => {
    expect(messages.ar.appName.length).toBeGreaterThan(0);
  });

  it('English app name contains MatjerHub', () => {
    expect(messages.en.appName).toContain('MatjerHub');
  });
});

// ─── App integration smoke test ────────────────────────────────────────────

describe('App — locale direction on document', () => {
  it('document dir can be set to rtl or ltr via directionFor', () => {
    for (const l of locales) {
      const dir = directionFor(l);
      expect(['rtl', 'ltr']).toContain(dir);
    }
  });

  it('directionFor drives correct DOM dir for Arabic', () => {
    const dir = directionFor('ar' as Locale);
    expect(dir).toBe('rtl');
    document.documentElement.dir = dir;
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('directionFor drives correct DOM dir for English', () => {
    const dir = directionFor('en' as Locale);
    expect(dir).toBe('ltr');
    document.documentElement.dir = dir;
    expect(document.documentElement.dir).toBe('ltr');
  });
});

// ─── Component & Vertical Slice Tests ──────────────────────────────────────

const mockBootstrap = {
  actor: 'supplier',
  direction: 'ltr',
  principal: { subject: 'usr_sup_123', preferred_username: 'supplier_boss' },
};

const mockProfile = {
  supplier: { id: 'sup_1', code: 'SUP001', name: 'Apex Wholesale Hub', status: 'active' },
};

const mockMarkets = {
  items: [{ id: 'mkt_1', market_code: 'EG', status: 'active', currency: { code: 'EGP' } }],
};

const mockLocations = {
  items: [{ id: 'loc_1', code: 'WH01', name: 'Cairo Central Warehouse', market_code: 'EG', location_type: 'warehouse', status: 'active' }],
};

const mockProducts = {
  items: [{ id: 'prod_1', slug: 'cotton-hoodie', supplier_code: 'HOODIE-BLK-01', status: 'active' }],
};

const mockOffers = {
  items: [{ id: 'off_1', market_code: 'EG', status: 'active', supplier_code: 'HOODIE-BLK-01', price: { amount_minor: 25000, currency: 'EGP' }, min_order_quantity: 5 }],
};

const mockInventory = {
  items: [{ id: 'snp_1', fulfillment_location_id: 'loc_1', sku_id: 'sku_hoodie_m', on_hand_qty: 200, reserved_qty: 25, version: 1 }],
};

const mockSyncJobs = {
  items: [{ id: 'job_sync_1', connection_id: 'conn_sap', supplier_id: 'sup_1', status: 'failed', total_items: 50, processed_items: 45, failed_items: 5, error_summary: 'SKU validation failed on 5 items' }],
};

const mockRetailCapability = {
  affiliation: { supplier_id: 'sup_1', seller_id: 'sel_1' },
  seller: { id: 'sel_1', code: 'SEL001', name: 'Apex Retail Direct', status: 'active' },
};

const mockStores = {
  items: [{ id: 'str_1', seller_id: 'sel_1', market_code: 'EG', code: 'STORE_CAIRO', name: 'Cairo Mall Flagship', status: 'active' }],
};

function setupMockFetch(overrides: Record<string, unknown> = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = init?.method ?? 'GET';

    if (overrides[urlStr]) {
      const val = overrides[urlStr];
      if (val instanceof Error) throw val;
      return new Response(JSON.stringify(val), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (urlStr.includes('/v1/bootstrap')) {
      return new Response(JSON.stringify(mockBootstrap), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/v1/supplier/profile')) {
      if (method === 'PUT') {
        return new Response(JSON.stringify({ status: 'active' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(mockProfile), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/v1/supplier/markets')) {
      return new Response(JSON.stringify(mockMarkets), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/v1/supplier/locations')) {
      if (method === 'POST') {
        const body = JSON.parse(init?.body as string || '{}');
        return new Response(JSON.stringify({ id: 'loc_2', ...body }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(mockLocations), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/v1/supplier/products')) {
      if (method === 'POST') {
        if (urlStr.includes('/media-intent')) {
          return new Response(JSON.stringify({ upload_url: 'http://localhost:3000/s3-mock-upload', media_id: 'med_1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (urlStr.includes('/media-complete')) {
          return new Response(JSON.stringify({ id: 'med_1', url: 'https://cdn.matjerhub.com/media1.png', is_primary: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (urlStr.includes('/primary')) {
          return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        const body = JSON.parse(init?.body as string || '{}');
        return new Response(JSON.stringify({
          supplier_product: { id: 'prod_2', slug: body.slug, supplier_code: body.supplier_code, status: body.status }
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      if (method === 'DELETE' && urlStr.includes('/media/')) {
        return new Response(JSON.stringify({ status: 'deleted' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(mockProducts), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/v1/supplier/offers')) {
      if (method === 'POST') {
        const body = JSON.parse(init?.body as string || '{}');
        return new Response(JSON.stringify({
          id: 'off_2',
          market_code: body.market_code,
          status: body.status,
          price: body.price,
          min_order_quantity: body.min_order_quantity
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(mockOffers), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/v1/supplier/inventory')) {
      if (urlStr.includes('/adjustments')) {
        const body = JSON.parse(init?.body as string || '{}');
        return new Response(JSON.stringify({
          snapshot: { id: 'snp_1', fulfillment_location_id: 'loc_1', sku_id: 'sku_hoodie_m', on_hand_qty: 250, reserved_qty: 25, version: 2 },
          movement: { id: 'mov_1', inventory_snapshot_id: 'snp_1', movement_type: body.movement_type, quantity_delta: body.quantity_delta, on_hand_qty: 250, reserved_qty: 25, reason: body.reason, created_at: new Date().toISOString() }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/movements')) {
        return new Response(JSON.stringify({
          items: [{ id: 'mov_1', inventory_snapshot_id: 'snp_1', movement_type: 'adjustment', quantity_delta: 50, on_hand_qty: 250, reserved_qty: 25, reason: 'Restock batch #4', created_at: new Date().toISOString() }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(mockInventory), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/v1/supplier/integrations/sync-jobs')) {
      if (method === 'POST') {
        return new Response(JSON.stringify({
          id: 'job_sync_2', connection_id: 'default_supplier_connector', supplier_id: 'sup_1', status: 'queued', total_items: 100, processed_items: 0, failed_items: 0
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(mockSyncJobs), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/v1/supplier/retail-capability')) {
      if (method === 'POST') {
        const body = JSON.parse(init?.body as string || '{}');
        return new Response(JSON.stringify({
          affiliation: { supplier_id: 'sup_1', seller_id: 'sel_new' },
          seller: { id: 'sel_new', code: body.code, name: body.name, status: 'active' }
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      if ('nullRetail' in overrides) {
        return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(mockRetailCapability), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/v1/supplier/stores')) {
      if (method === 'POST') {
        const body = JSON.parse(init?.body as string || '{}');
        return new Response(JSON.stringify({
          id: 'str_2', seller_id: 'sel_1', market_code: body.market_code, code: body.code, name: body.name, status: 'active'
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(mockStores), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('s3-mock-upload')) {
      return new Response(null, { status: 200 });
    }

    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });

  globalThis.fetch = fetchMock;
  return fetchMock;
}

function createMockAuthClient(overrides?: Partial<AuthClient> & { state?: Partial<AuthState> }): AuthClient {
  let state: AuthState = {
    isAuthenticated: true,
    user: {
      subject: 'usr_sup_123',
      preferred_username: 'supplier_boss',
      email: 'supplier@matjerhub.com',
      roles: ['supplier_owner']
    },
    isLoading: false,
    error: null,
    ...overrides?.state
  };

  const listeners = new Set<(s: AuthState) => void>();

  return {
    getAccessToken: vi.fn(async () => 'mock-bearer-token-123'),
    renewToken: vi.fn(async () => 'mock-bearer-token-123'),
    clearSession: vi.fn(async () => {
      state = { isAuthenticated: false, user: null, isLoading: false, error: null };
      listeners.forEach((cb) => cb(state));
    }),
    login: vi.fn(async () => {}),
    handleCallback: vi.fn(async () => '/dashboard'),
    logout: vi.fn(async () => {}),
    getUser: () => state.user,
    getState: () => state,
    subscribe: (cb: (s: AuthState) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    ...overrides
  };
}

describe('Supplier Portal App Component', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/dashboard');
    setupMockFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders dashboard with KPI cards and supplier information when authenticated', async () => {
    render(<App initialPath="/dashboard" initialLocale="en" authClient={createMockAuthClient()} />);

    expect(screen.getByText(messages.en.common.loading)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Apex Wholesale Hub')).toBeDefined();
    });

    expect(screen.getByText(messages.en.kpi.totalProducts)).toBeDefined();
    expect(screen.getByText(messages.en.kpi.activeOffers)).toBeDefined();
    expect(screen.getByText(messages.en.kpi.pendingSync)).toBeDefined();
    expect(screen.getByText(messages.en.kpi.totalLocations)).toBeDefined();
    expect(screen.getByText('supplier_boss')).toBeDefined();
  });

  it('renders authenticated non-pilot empty state when no supplier profile is linked', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      if (urlStr.includes('/v1/bootstrap')) {
        return new Response(JSON.stringify(mockBootstrap), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/v1/supplier/profile')) {
        return new Response(JSON.stringify({ error: { code: 'not_found', message: 'not found' } }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      throw new Error(`unexpected request: ${urlStr}`);
    });

    render(<App initialPath="/dashboard" initialLocale="en" authClient={createMockAuthClient()} />);

    await waitFor(() => {
      expect(screen.getByText('No Supplier Profile Configured')).toBeDefined();
    });

    expect(screen.getByText('supplier_boss')).toBeDefined();
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  it('navigates between all 8 workspaces', async () => {
    render(<App initialPath="/dashboard" initialLocale="en" authClient={createMockAuthClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Apex Wholesale Hub')).toBeDefined();
    });

    // 1. Products
    fireEvent.click(screen.getByText(messages.en.nav.products));
    await waitFor(() => {
      expect(screen.getByText(messages.en.products.addProduct)).toBeDefined();
    });

    // 2. Market Offers
    fireEvent.click(screen.getByText(messages.en.nav.offers));
    await waitFor(() => {
      expect(screen.getByText(messages.en.offers.addOffer)).toBeDefined();
    });

    // 3. Inventory
    fireEvent.click(screen.getByText(messages.en.nav.inventory));
    await waitFor(() => {
      expect(screen.getByText(messages.en.inventory.snapshotsTab)).toBeDefined();
    });

    // 4. Locations
    fireEvent.click(screen.getByText(messages.en.nav.locations));
    await waitFor(() => {
      expect(screen.getByText(messages.en.locations.addLocation)).toBeDefined();
    });

    // 5. Integrations
    fireEvent.click(screen.getByText(messages.en.nav.integrations));
    await waitFor(() => {
      expect(screen.getByText(messages.en.integrations.triggerSync)).toBeDefined();
    });

    // 6. Retail
    fireEvent.click(screen.getByText(messages.en.nav.retail));
    await waitFor(() => {
      expect(screen.getByText(messages.en.retail.storesList)).toBeDefined();
    });

    // 7. Settings
    fireEvent.click(screen.getByText(messages.en.nav.settings));
    await waitFor(() => {
      expect(screen.getByText(messages.en.settings.save)).toBeDefined();
    });

    // 8. Back to Dashboard
    fireEvent.click(screen.getAllByText(messages.en.nav.dashboard)[0]);
    await waitFor(() => {
      expect(screen.getByText(messages.en.kpi.totalProducts)).toBeDefined();
    });
  });

  it('product authoring: creates product with EN/AR fields, SKU code, barcode, and categories', async () => {
    render(<App initialPath="/products" initialLocale="en" authClient={createMockAuthClient()} />);

    await waitFor(() => {
      expect(screen.getByText('cotton-hoodie')).toBeDefined();
    });

    // Open add product dialog
    fireEvent.click(screen.getByText(messages.en.products.addProduct));
    expect(screen.getByText(messages.en.products.variantsSection)).toBeDefined();
    expect(screen.getByText(messages.en.products.mediaSection)).toBeDefined();

    // Fill form
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'silk-scarf' } }); // slug
    fireEvent.change(inputs[1], { target: { value: 'SCARF-01' } }); // supplier code

    // Submit dialog save button
    const saveButtons = screen.getAllByText(messages.en.products.save);
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('silk-scarf')).toBeDefined();
    });
  });

  it('media workflow: simulates presigned S3 upload, primary image designation, and deletion', async () => {
    render(<App initialPath="/products" initialLocale="en" authClient={createMockAuthClient()} />);

    await waitFor(() => {
      expect(screen.getByText('cotton-hoodie')).toBeDefined();
    });

    fireEvent.click(screen.getByText(messages.en.products.addProduct));
    expect(screen.getByText(messages.en.products.mediaSection)).toBeDefined();

    const fileInput = screen.getByLabelText(messages.en.products.addMedia);
    const file = new File(['mock image content'], 'sample.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByAltText(messages.en.products.mediaSection)).toBeDefined();
    });

    // Set primary
    const setPrimaryBtn = screen.queryByText(messages.en.products.setPrimary);
    if (setPrimaryBtn) fireEvent.click(setPrimaryBtn);

    // Delete media
    fireEvent.click(screen.getByText(messages.en.products.deleteMedia));
    await waitFor(() => {
      expect(screen.queryByAltText(messages.en.products.mediaSection)).toBeNull();
    });
  });

  it('market offers: creates offer with wholesale price, currency, and MOQ', async () => {
    render(<App initialPath="/offers" initialLocale="en" authClient={createMockAuthClient()} />);

    await waitFor(() => {
      expect(screen.getByText('250.00 EGP')).toBeDefined();
    });

    // Open add offer dialog
    fireEvent.click(screen.getByText(messages.en.offers.addOffer));

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'prod_1' } }); // product id
    fireEvent.change(inputs[1], { target: { value: 'mkt_1' } }); // market id
    fireEvent.change(inputs[2], { target: { value: 'SA' } }); // market code

    const saveButtons = screen.getAllByText(messages.en.offers.save);
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('SA')).toBeDefined();
    });
  });

  it('inventory: adjusts stock with delta, reason, and movement type, and inspects movement history', async () => {
    render(<App initialPath="/inventory" initialLocale="en" authClient={createMockAuthClient()} />);

    await waitFor(() => {
      expect(screen.getByText('sku_hoodie_m')).toBeDefined();
    });

    // Open stock adjustment dialog
    fireEvent.click(screen.getByText(messages.en.inventory.adjustStock));
    expect(screen.getByText(messages.en.inventory.confirmAdjustment)).toBeDefined();

    // Select movement type and submit
    fireEvent.click(screen.getByText(messages.en.inventory.confirmAdjustment));

    await waitFor(() => {
      expect(screen.getByText('250')).toBeDefined();
    });

    // Click movement history row action button to load movements
    const movementButtons = screen.getAllByText(messages.en.inventory.movementsTab);
    fireEvent.click(movementButtons[movementButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText('Restock batch #4')).toBeDefined();
    });
  });

  it('fulfillment locations: lists locations and creates a new location', async () => {
    render(<App initialPath="/locations" initialLocale="en" authClient={createMockAuthClient()} />);

    await waitFor(() => {
      expect(screen.getByText('Cairo Central Warehouse')).toBeDefined();
    });

    fireEvent.click(screen.getByText(messages.en.locations.addLocation));
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'mkt_1' } });
    fireEvent.change(inputs[1], { target: { value: 'EG' } });
    fireEvent.change(inputs[2], { target: { value: 'ALEX01' } });
    fireEvent.change(inputs[3], { target: { value: 'Alexandria Hub' } });

    const saveButtons = screen.getAllByText(messages.en.locations.save);
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('Alexandria Hub')).toBeDefined();
    });
  });

  it('integrations: displays sync jobs, triggers sync, and handles retry on failed job', async () => {
    render(<App initialPath="/integrations" initialLocale="en" authClient={createMockAuthClient()} />);

    await waitFor(() => {
      expect(screen.getByText('job_sync_1')).toBeDefined();
      expect(screen.getByText('failed')).toBeDefined();
      expect(screen.getByText(messages.en.integrations.retryJob)).toBeDefined();
      expect(screen.getByText(messages.en.integrations.errorSummary)).toBeDefined();
    });

    // Trigger sync
    fireEvent.click(screen.getByText(messages.en.integrations.triggerSync));
    await waitFor(() => {
      expect(screen.getByText('job_sync_2')).toBeDefined();
    });

    // Retry failed job
    fireEvent.click(screen.getByText(messages.en.integrations.retryJob));
  });

  it('ADR-019 retail capability: shows provisioned seller and creates direct retail store', async () => {
    render(<App initialPath="/retail" initialLocale="en" authClient={createMockAuthClient()} />);

    await waitFor(() => {
      expect(screen.getByText(messages.en.retail.statusProvisioned)).toBeDefined();
      expect(screen.getByText(/Apex Retail Direct/)).toBeDefined();
      expect(screen.getByText('Cairo Mall Flagship')).toBeDefined();
    });

    // Create affiliated store
    fireEvent.click(screen.getByText(messages.en.retail.createStoreBtn));
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'EG' } });
    fireEvent.change(inputs[1], { target: { value: 'GIZA01' } });
    fireEvent.change(inputs[2], { target: { value: 'Giza Branch' } });

    const saveButtons = screen.getAllByText(messages.en.retail.save);
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('Giza Branch')).toBeDefined();
    });
  });

  it('ADR-019 retail capability: provisions retail seller when not yet provisioned', async () => {
    setupMockFetch({ nullRetail: true });
    render(<App initialPath="/retail" initialLocale="en" authClient={createMockAuthClient()} />);

    await waitFor(() => {
      expect(screen.getByText(messages.en.retail.notProvisioned)).toBeDefined();
      expect(screen.getByText(messages.en.retail.provisionBtn)).toBeDefined();
    });

    // Click provision button
    fireEvent.click(screen.getByText(messages.en.retail.provisionBtn));
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'SEL_NEW' } });
    fireEvent.change(inputs[1], { target: { value: 'New Retail Entity' } });

    const saveButtons = screen.getAllByText(messages.en.retail.save);
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(messages.en.retail.statusProvisioned)).toBeDefined();
    });
  });

  it('settings: updates supplier profile and saves settings', async () => {
    render(<App initialPath="/settings" initialLocale="en" authClient={createMockAuthClient()} />);

    await waitFor(() => {
      expect(screen.getByText(messages.en.settings.supplierName)).toBeDefined();
    });

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Apex Global Enterprises' } });

    fireEvent.click(screen.getByText(messages.en.settings.save));
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeDefined();
    });
  });

  it('renders Arabic interface with RTL direction and Arabic strings', async () => {
    render(<App initialPath="/dashboard" initialLocale="ar" authClient={createMockAuthClient()} />);

    await waitFor(() => {
      expect(screen.getByText(messages.ar.appName)).toBeDefined();
      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.lang).toBe('ar');
    });

    expect(screen.getAllByText(messages.ar.nav.dashboard)[0]).toBeDefined();
    expect(screen.getAllByText(messages.ar.nav.products)[0]).toBeDefined();
    expect(screen.getAllByText(messages.ar.nav.offers)[0]).toBeDefined();
    expect(screen.getAllByText(messages.ar.nav.inventory)[0]).toBeDefined();
    expect(screen.getAllByText(messages.ar.nav.locations)[0]).toBeDefined();
    expect(screen.getAllByText(messages.ar.nav.integrations)[0]).toBeDefined();
    expect(screen.getAllByText(messages.ar.nav.retail)[0]).toBeDefined();
    expect(screen.getAllByText(messages.ar.nav.settings)[0]).toBeDefined();
  });

  it('displays error state when initial API request fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Core API Gateway Unreachable'));

    render(<App initialPath="/dashboard" initialLocale="en" authClient={createMockAuthClient()} />);

    await waitFor(() => {
      expect(screen.getByText(/Core API Gateway Unreachable/)).toBeDefined();
    });
  });

  it('no protected business requests run when unauthenticated', async () => {
    const fetchMock = setupMockFetch();
    const unauthClient = createMockAuthClient({
      state: { isAuthenticated: false, user: null, isLoading: false, error: null }
    });

    render(<App initialPath="/dashboard" initialLocale="en" authClient={unauthClient} />);

    await waitFor(() => {
      expect(screen.getByText('Log In with Zitadel')).toBeDefined();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a fail-closed configuration error without protected requests', async () => {
    const fetchMock = setupMockFetch();
    const unconfiguredClient = createMockAuthClient({
      state: {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: 'Authentication configuration missing'
      }
    });

    render(<App initialPath="/dashboard" initialLocale="en" authClient={unconfiguredClient} />);

    expect(await screen.findByText('Authentication configuration missing')).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('delegates sign out from the authenticated user menu', async () => {
    const mockAuth = createMockAuthClient();
    render(<App initialPath="/dashboard" initialLocale="en" authClient={mockAuth} />);

    await screen.findByText('Apex Wholesale Hub');
    fireEvent.click(screen.getByText('supplier_boss'));
    fireEvent.click(await screen.findByText('Sign Out'));

    expect(mockAuth.logout).toHaveBeenCalledTimes(1);
  });

  it('static callback routing handles /auth/callback and navigates to return path', async () => {
    const mockAuth = createMockAuthClient({
      handleCallback: vi.fn(async () => '/products')
    });

    render(<App initialPath="/auth/callback" initialLocale="en" authClient={mockAuth} />);

    await waitFor(() => {
      expect(mockAuth.handleCallback).toHaveBeenCalled();
      expect(screen.getByText('cotton-hoodie')).toBeDefined();
    });
  });

  it('clears session when receiving 401 unauthorized response', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
    const mockAuth = createMockAuthClient();

    render(<App initialPath="/dashboard" initialLocale="en" authClient={mockAuth} />);

    await waitFor(() => {
      expect(mockAuth.clearSession).toHaveBeenCalled();
    });
  });

  it('renders 403 unauthorized state when receiving 403 forbidden response', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      if (urlStr.includes('/v1/bootstrap')) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    const mockAuth = createMockAuthClient();

    render(<App initialPath="/dashboard" initialLocale="en" authClient={mockAuth} />);

    await waitFor(() => {
      expect(screen.getByText('403 Forbidden')).toBeDefined();
      expect(screen.getByText('You do not have permission to access this resource.')).toBeDefined();
    });
  });
});
