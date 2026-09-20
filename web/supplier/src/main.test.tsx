import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { messages, directionFor } from './i18n/locales';
import { App } from './main';

// Mock responses
const mockBootstrap = {
  actor: 'supplier',
  direction: 'rtl',
  principal: { subject: 'sub-1', preferred_username: 'supplier_admin' },
  markets: [{ code: 'EG', country: { name: 'Egypt' }, currency: { code: 'EGP' } }]
};

const mockProfile = {
  supplier: { id: 'sup-1', code: 'SUP01', name: 'Al-Madina Supplies', status: 'active' },
  settings: { tone: 'stable' }
};

const mockMarkets = { items: [{ id: 'mkt-1', market_code: 'EG', status: 'active' }] };
const mockLocations = { items: [{ id: 'loc-1', code: 'WH-CAIRO', name: 'Cairo Hub', market_code: 'EG', location_type: 'warehouse', status: 'active' }] };
const mockProducts = { items: [{ id: 'prod-1', slug: 'office-chair', supplier_code: 'SKU-CHAIR-01', status: 'active' }] };
const mockOffers = { items: [{ id: 'off-1', market_code: 'EG', status: 'active', wholesale_price: { amount_minor: 15000, currency: 'EGP' }, available_qty: 50 }] };
const mockInventory = { items: [{ id: 'snp-1', fulfillment_location_id: 'loc-1', sku_id: 'SKU-CHAIR-01', on_hand_qty: 100, reserved_qty: 10, version: 1 }] };
const mockSyncJobs = { items: [{ id: 'job-1', connection_id: 'salla', supplier_id: 'sup-1', status: 'completed', total_items: 20, processed_items: 20, failed_items: 0 }] };
const mockRetail = { affiliation: { supplier_id: 'sup-1', seller_id: 'sel-1' }, seller: { id: 'sel-1', code: 'store1', name: 'Retail Store', status: 'active' } };
const mockStores = { items: [{ id: 'str-1', seller_id: 'sel-1', market_code: 'EG', code: 'store1', name: 'Retail Store', status: 'active' }] };

describe('Supplier Portal Foundation, Locales & Operations', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((input: unknown) => {
      const urlStr = String(input);
      let data: any = {};
      if (urlStr.includes('/v1/bootstrap')) data = mockBootstrap;
      else if (urlStr.includes('/v1/supplier/profile')) data = mockProfile;
      else if (urlStr.includes('/v1/supplier/markets')) data = mockMarkets;
      else if (urlStr.includes('/v1/supplier/locations')) data = mockLocations;
      else if (urlStr.includes('/v1/supplier/products')) data = mockProducts;
      else if (urlStr.includes('/v1/supplier/offers')) data = mockOffers;
      else if (urlStr.includes('/v1/supplier/inventory')) data = mockInventory;
      else if (urlStr.includes('/v1/supplier/integrations/sync-jobs')) data = mockSyncJobs;
      else if (urlStr.includes('/v1/supplier/retail-capability')) data = mockRetail;
      else if (urlStr.includes('/v1/supplier/stores')) data = mockStores;

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
      });
    }));
  });

  it('verifies direction and key messages for Arabic and English', () => {
    expect(directionFor('ar')).toBe('rtl');
    expect(directionFor('en')).toBe('ltr');

    expect(messages.ar.appName).toBe('لوحة تحكم المورد');
    expect(messages.en.appName).toBe('Supplier Portal');
    expect(messages.ar.products.title).toContain('منتجات');
    expect(messages.en.products.title).toContain('Catalog');
  });

  it('renders Supplier Portal App and loads dashboard metrics successfully', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Al-Madina Supplies')).toBeDefined();
      expect(screen.getByText('100')).toBeDefined();
    });
  });
});
