import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { directionFor, messages, locales, type Locale } from './i18n/locales';

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
    // directionFor returns one of exactly two values that are valid HTML dir attributes.
    for (const l of locales) {
      const dir = directionFor(l);
      expect(['rtl', 'ltr']).toContain(dir);
    }
  });

  it('directionFor drives correct DOM dir for Arabic', () => {
    const dir = directionFor('ar' as Locale);
    expect(dir).toBe('rtl');
    // Simulate what main.tsx does:
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
