import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { supplierNavigation } from '@matjerhub/ui';

describe('Supplier Portal Foundation & Navigation', () => {
  it('defines valid supplier navigation items', () => {
    const paths = supplierNavigation.map((n) => n.path);
    expect(paths).toContain('/dashboard');
    expect(paths).toContain('/catalog');
    expect(paths).toContain('/offers');
    expect(paths).toContain('/inventory');
    expect(paths).toContain('/fulfillment');
  });
});
