# Supplier Store Operations Foundation and Live Vertical Slice — Implementation Plan

## Executive Summary
This implementation plan establishes the complete production-grade foundation and live vertical slice for the **Supplier Portal / Wholesale Commerce Operations** within `matjeroapps/supplier`, fully aligned through the interactive `/grill-me` architectural review.

The Supplier Portal's primary role is wholesale supply operations: wholesale product authoring, multi-variant/SKU management, media galleries, wholesale pricing, market offer publication with MOQ and effective constraints, fulfillment locations, inventory snapshot/movement adjustments, and external sync operations (with direct retail store management remaining an affiliated secondary capability).

---

## Aligned Design Decisions (from `/grill-me` Architecture Review)

1. **Top-Level Navigation & Workspace Topology**:
   - Primary Focus: Wholesale Supply Operations (`/dashboard`, `/products`, `/offers`, `/inventory`, `/locations`, `/integrations`, `/settings`).
   - Secondary Section: Affiliated Direct Retail Store capability (`/retail`).
2. **Product Authoring & Variant/SKU Architecture**:
   - Multi-SKU authoring with single-SKU default, dual Arabic/English localization, category assignments, and configurable variant option axes (Size, Color) with distinct SKU codes and barcodes.
3. **Media Management & Presigned Uploads**:
   - Embedded gallery uploader using Core presigned S3 contracts (intent creation -> binary upload -> completion verification), with thumbnail previews, primary image designation, and deletion.
4. **Market Offers & Wholesale Merchandising**:
   - Initial offer configuration in product authoring plus a dedicated "Market Offers" workspace for wholesale cost pricing, currency matching market code, MOQ, availability toggling, and market filtering.
5. **Inventory & Fulfillment Locations**:
   - Locations management (creating/viewing locations per market), SKU stock snapshot overview (on-hand vs reserved), quick stock adjustment dialog (delta, reason, movement type), and movement audit history.
6. **External Integrations & Sync Hub**:
   - Dedicated sync hub view showing active connector status, "Sync Catalog Now" trigger, historical sync job run list with status badges, live item progress (processed/failed/total), detailed error summaries, and retry actions.
7. **Verification & Vertical Slice**:
   - Full test suite: Go unit/contract tests, Frontend Vitest component tests with 100% RTL/LTR coverage, cross-system vertical slice verification, and full local build/lint/diff audit.

---

## Proposed Changes

### 1. Supplier Core Client Layer (`supplier/internal/coreclient`)

#### [MODIFY] `suppliers.go`
- Add retail capability DTOs: `SupplierSellerAffiliation`, `Seller`, `Store`, `SupplierRetailCapabilityResponse`, `SupplierRetailCapabilityRequest`, `SupplierStoreCreateRequest`.
- Add client methods:
  - `GetSupplierRetailCapability(ctx, supplierID, subject)`
  - `CreateSupplierRetailCapability(ctx, supplierID, subject, req)`
  - `ListSupplierStores(ctx, supplierID, subject, page)`
  - `CreateSupplierStore(ctx, supplierID, subject, req)`

#### [MODIFY] `client.go`
- Add `patch` and `delete` helper methods for complete HTTP method coverage.

#### [MODIFY] `client_test.go`
- Add contract tests verifying retail capability endpoints, store listing/creation, error handling, and parameter propagation.

---

### 2. Supplier Actor API Surface (`supplier/internal/supplierapi`)

#### [MODIFY] `contracts.go`
- Define request and response contracts for retail capability, affiliated stores, sync jobs, and extended product/offer metadata.

#### [MODIFY] `router.go`
- Update `CoreCapabilities` interface with retail capability and store methods.
- Register routes:
  - `GET /v1/supplier/retail-capability`
  - `POST /v1/supplier/retail-capability`
  - `GET /v1/supplier/stores`
  - `POST /v1/supplier/stores`
- Implement handlers enforcing subject resolution and tenant isolation via `deps.supplierID(w, r)`.

#### [MODIFY] `router_test.go`
- Update `stubCore` and add test cases for retail capability, store provisioning, and sync operations.

---

### 3. OpenAPI Specifications (`supplier/docs/api/supplier`)

#### [MODIFY] `specs.go`
- Register RouteSpec entries for sync jobs (`/v1/supplier/integrations/sync-jobs`, `/v1/supplier/integrations/sync-jobs/{id}`), retail capability (`/v1/supplier/retail-capability`), and stores (`/v1/supplier/stores`).

#### [MODIFY] `openapi.json`
- Regenerate OpenAPI documentation using `go run ./cmd/openapi-gen`.

---

### 4. Supplier Web Portal (`supplier/web/supplier`)

#### [MODIFY] `locales.ts`
- Add comprehensive Arabic and English translation dictionaries covering:
  - Navigation tabs (Dashboard, Products, Offers, Inventory, Locations, Integrations & Sync, Settings, Retail)
  - Product Authoring (title, slug, status, categories, translations)
  - Variants & SKU Manager (code, barcode, options, stock)
  - Media uploader & gallery (presigned upload, delete, primary)
  - Market Offers (wholesale price, currency, market selection, MOQ, status)
  - Inventory Snapshots & Adjustment Dialog (delta, reason, movement history)
  - Fulfillment Locations (code, name, type, market)
  - Integration Sync Jobs (status, total/processed/failed, retry, errors)
  - Affiliated Retail Store (provisioning, store list)

#### [MODIFY] `main.tsx`
- Build the full production-ready Supplier Portal using `@matjerhub/ui-sdk`:
  - **Dashboard Overview**: KPI cards (Total Products, Active Offers, Total Stock, Active Sync Jobs).
  - **Products & Authoring**: Table with search/filter, product details, multi-variant/SKU builder, media gallery with presigned upload simulation, and category selection.
  - **Market Offers**: Offer list, wholesale cost pricing with currency formatting, market badges, availability toggle, and new offer dialog.
  - **Inventory & Locations**: Location selector, snapshot list (on-hand vs reserved), quick stock adjustment modal (delta, reason, type), and movement audit history.
  - **Integrations & Sync Hub**: Connector cards, live sync trigger button, historical job list with status badges, progress metrics, and error diagnostics.
  - **Affiliated Retail Store**: Retail capability status, provisioning form, and store overview.
  - **Profile & Settings**: Profile editor and locale switcher.

#### [MODIFY] `main.test.tsx`
- Add comprehensive Vitest tests verifying:
  - Initial dashboard loading and rendering
  - Navigation between all tabs
  - Product authoring and modal interactions
  - Offer creation and pricing updates
  - Inventory snapshot adjustments and location creation
  - Sync job triggering and status display
  - RTL/LTR Arabic and English localization rendering

---

## Verification Plan

### Automated Tests

1. **Go Toolchain & Backend Suite**:
   ```bash
   cd /Users/zidan/www/personal/Matjerhub/supplier
   gofmt -s -w .
   go vet ./...
   go test -v -race ./...
   ```

2. **OpenAPI Generator & Spec Verification**:
   ```bash
   cd /Users/zidan/www/personal/Matjerhub/supplier
   go run ./cmd/openapi-gen
   git diff --exit-code docs/api/supplier/openapi.json
   ```

3. **Frontend Suite**:
   ```bash
   cd /Users/zidan/www/personal/Matjerhub/supplier/web/supplier
   npm run typecheck
   npm run test
   npm run build
   ```

4. **Git Hygiene & Phase-Name Leakage Audit**:
   ```bash
   cd /Users/zidan/www/personal/Matjerhub/supplier
   git diff --check
   ```

5. **Implementation Report**:
   Create `supplier/docs/implementation/supplier-store-operations-foundation-report.md`.

6. **Git & Delivery**:
   - Commit all changes to `feature/supplier-store-operations-foundation`.
   - Push to `origin`.
   - Open GitHub PR against `main`.
