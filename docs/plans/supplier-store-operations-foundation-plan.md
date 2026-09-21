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
   - Full test suite: Go unit/contract tests with race detection, Frontend Vitest component tests covering RTL/LTR localization, workspace navigation, and form workflows, contract verification, and local build/lint/diff audit.

---

## Proposed Changes

### 1. Supplier Core Client Layer (`internal/coreclient`)

#### [MODIFY] [suppliers.go](internal/coreclient/suppliers.go)
- Add retail capability DTOs: `SupplierSellerAffiliation`, `Seller`, `Store`, `SupplierRetailCapabilityResponse`, `SupplierRetailCapabilityRequest`, `SupplierStoreCreateRequest`.
- Add client methods:
  - `GetSupplierRetailCapability(ctx, supplierID, subject)`
  - `CreateSupplierRetailCapability(ctx, supplierID, subject, req)`
  - `ListSupplierStores(ctx, supplierID, subject, page)`
  - `CreateSupplierStore(ctx, supplierID, subject, req)`

#### [MODIFY] [client.go](internal/coreclient/client.go)
- Add `patch` and `delete` helper methods for complete HTTP method coverage.

#### [MODIFY] [client_test.go](internal/coreclient/client_test.go)
- Add contract tests verifying retail capability endpoints, store listing/creation, error handling, and parameter propagation.

---

### 2. Supplier Actor API Surface (`internal/supplierapi`)

#### [MODIFY] [contracts.go](internal/supplierapi/contracts.go)
- Define request and response contracts for retail capability, affiliated stores, sync jobs, and extended product/offer metadata.

#### [MODIFY] [router.go](internal/supplierapi/router.go)
- Update `CoreCapabilities` interface with retail capability and store methods.
- Register routes:
  - `GET /v1/supplier/retail-capability`
  - `POST /v1/supplier/retail-capability`
  - `GET /v1/supplier/stores`
  - `POST /v1/supplier/stores`
- Implement handlers enforcing subject resolution and tenant isolation via `deps.supplierID(w, r)`.

#### [MODIFY] [router_test.go](internal/supplierapi/router_test.go)
- Update `stubCore` and add test cases for retail capability, store provisioning, and sync operations.

---

### 3. OpenAPI Specifications (`docs/api/supplier`)

#### [MODIFY] [specs.go](internal/openapi/specs.go)
- Register RouteSpec entries for sync jobs (`/v1/supplier/integrations/sync-jobs`, `/v1/supplier/integrations/sync-jobs/{id}`), retail capability (`/v1/supplier/retail-capability`), and stores (`/v1/supplier/stores`).

#### [MODIFY] [openapi.json](docs/api/supplier/openapi.json)
- Regenerate OpenAPI documentation using `go run ./cmd/openapi-gen`.

---

### 4. Supplier Web Portal (`web/supplier`)

#### [MODIFY] [locales.ts](web/supplier/src/i18n/locales.ts)
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

#### [MODIFY] [main.tsx](web/supplier/src/main.tsx)
- Build the full production-ready Supplier Portal using `@matjerhub/ui-sdk`:
  - **Dashboard Overview**: KPI cards (Total Products, Active Offers, Total Stock, Active Sync Jobs).
  - **Products & Authoring**: Table with search/filter, product details, multi-variant/SKU builder, media gallery with presigned upload simulation, and category selection.
  - **Market Offers**: Offer list, wholesale cost pricing with currency formatting, market badges, availability toggle, and new offer dialog.
  - **Inventory & Locations**: Location selector, snapshot list (on-hand vs reserved), quick stock adjustment modal (delta, reason, type), and movement audit history.
  - **Integrations & Sync Hub**: Connector cards, live sync trigger button, historical job list with status badges, progress metrics, and error diagnostics.
  - **Affiliated Retail Store**: Retail capability status, provisioning form, and store overview.
  - **Profile & Settings**: Profile editor and locale switcher.

#### [MODIFY] [main.test.tsx](web/supplier/src/main.test.tsx)
- Add comprehensive Vitest tests verifying:
  - Initial dashboard loading and rendering
  - Navigation between all tabs
  - Product authoring and modal interactions
  - Offer creation and pricing updates
  - Inventory snapshot adjustments and location creation
  - Sync job triggering and status display
  - RTL/LTR Arabic and English localization rendering and direction behavior

---

## Verification Plan & Classification Boundaries

### Automated Tests (Executed & Verified)

1. **Go Toolchain & Backend Suite**:
   ```bash
   gofmt -s -w .
   go vet ./...
   go test -v -race ./...
   go test ./...
   ```

2. **OpenAPI Generator & Spec Verification**:
   ```bash
   go run ./cmd/openapi-gen
   git diff --exit-code docs/api/supplier/openapi.json
   ```

3. **Frontend Suite**:
   ```bash
   cd web/supplier
   npm run typecheck
   npm run test
   npm run build
   ```

4. **Git Hygiene & Phase-Name Leakage Audit**:
   ```bash
   git diff --check
   ```

5. **Implementation Report**:
   Create `docs/implementation/supplier-store-operations-foundation-report.md`.

### Environment Boundaries (Documented Limitations)

- **Physical S3/MinIO Object Storage**: Presigned upload contracts and workflows are verified via client/BFF tests; physical S3 bucket uploads remain unverified in the local sandbox due to absent cloud storage infrastructure.
- **External Third-Party Connectors**: Sync Hub UI, job state machines, progress tracking, and retries are verified; live external API execution against third-party platforms (e.g. Salla, Zid, ERP) is unverified.
- **Cross-Service Live Multi-Process Orchestration**: Core client and Supplier API contracts are verified against in-process HTTP stubs; live cross-process networked orchestration against a live Core daemon with PostgreSQL is unverified in isolated testing.
