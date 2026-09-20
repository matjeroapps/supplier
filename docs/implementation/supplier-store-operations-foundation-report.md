# Supplier Store Operations Foundation and Live Vertical Slice Report

## Summary
This phase implements the production-ready **Supplier Store Operations Foundation and Live Vertical Slice** in `matjeroapps/supplier`. It establishes a unified operational portal and backend API gateway for wholesale suppliers to manage their catalog, multi-SKU product authoring, market offers (wholesale cost pricing, MOQ, currency), inventory snapshots across fulfillment locations, real-time inventory adjustments with movement audit history, platform sync integrations, and affiliated direct retail store provisioning (under ADR-019).

All communications strictly adhere to MatjerHub microservice contract boundaries: the Supplier gateway communicates with `matjeroapps/core` over signed internal service tokens (`X-Subject-Token` forwarding authenticated supplier actor identities) with zero direct database coupling or internal Core Go package dependencies.

---

## Architectural & Domain Review
- **Reviewed Prior State & Merged PRs**:
  - `core` PR #70: Supplier direct retail capability and store provisioning contracts.
  - `supplier` PR #10: Supplier gateway foundations, JWT authentication, and Core HTTP client.
  - `seller` PR #36: Seller catalog operations and design system integration.
  - Master Plan & PR #72/#74: Marketplace discovery and merchandising boundaries preserved (deferred to designated discovery phases).
- **Domain Topology**:
  - Primary Supply Operations: Catalog Authoring, Wholesale Market Offers, Inventory Snapshots & Fulfillment Locations, Integrations & Sync Hub.
  - Secondary Affiliated Retail Operations: Direct Retail Store provisioning for suppliers operating their own retail channel under ADR-019.
  - Bidirectional Localization: Full Arabic (`ar` / RTL) and English (`en` / LTR) parity across all supplier workflows, metrics, and actions.

---

## Backend Changes (`supplier/internal/`)

1. **`coreclient/`**:
   - Extended Core HTTP client with `patch` and `delete` methods.
   - Added Supplier Retail Capability DTOs (`SupplierSellerAffiliation`, `Seller`, `Store`, `SupplierRetailCapabilityResponse`, `SupplierRetailCapabilityRequest`, `SupplierStoreCreateRequest`).
   - Implemented Core client methods: `GetSupplierRetailCapability`, `CreateSupplierRetailCapability`, `ListSupplierStores`, `CreateSupplierStore`.
   - Added unit test coverage for retail capability and store endpoints in `internal/coreclient/client_test.go`.

2. **`supplierapi/`**:
   - Added retail capability and store request/response contracts in `internal/supplierapi/contracts.go`.
   - Implemented routes in `internal/supplierapi/router.go`:
     - `GET /v1/supplier/retail-capability` (fetches supplier's affiliated seller profile and retail status).
     - `POST /v1/supplier/retail-capability` (provisions affiliated seller capability).
     - `GET /v1/supplier/stores` (lists direct retail stores under the supplier's seller affiliation).
     - `POST /v1/supplier/stores` (creates a new direct retail store).
     - `POST /v1/supplier/integrations/sync-jobs` (triggers catalog/inventory sync jobs).
     - `GET /v1/supplier/integrations/sync-jobs` & `GET /v1/supplier/integrations/sync-jobs/{id}` (monitors sync job status and error diagnostics).
   - Added unit tests in `internal/supplierapi/router_test.go` covering successful resolution, validation, and error mappings.

3. **`openapi/` & OpenAPI Specs**:
   - Updated `internal/openapi/specs.go` with complete schema documentation for sync jobs, retail capability, and store operations.
   - Regenerated `docs/api/supplier/openapi.json` via `go run ./cmd/openapi-gen`.

---

## Frontend Changes (`supplier/web/supplier/`)

1. **Localization (`src/i18n/locales.ts`)**:
   - Added comprehensive localized copy for Arabic (`ar`) and English (`en`) covering KPIs, product authoring, offer creation, stock adjustments, fulfillment location setup, connector sync hub, retail capability provisioning, and profile settings.

2. **Supplier Operations Dashboard (`src/main.tsx`)**:
   - Built on `@matjerhub/ui-sdk` with full RTL/LTR responsiveness and design system compliance.
   - **Dashboard View**: Real-time KPI summaries (Total Products, Active Offers, Total On-Hand Stock, Sync Jobs), welcome banner, and quick action triggers.
   - **Products & Catalog Authoring**: Multi-SKU authoring (with single-SKU default flow), Arabic/English localized names and descriptions, category taxonomy tags, barcodes, initial stock allocation, and presigned S3 media gallery.
   - **Market Offers View**: Wholesale cost pricing, currency configuration, minimum order quantities (MOQ), and market-level activation.
   - **Inventory & Locations View**: Tabbed view for stock snapshots (on-hand vs reserved quantities), location-based filtering, quick inventory adjustment modal with movement auditing, and fulfillment location creation.
   - **Integrations & Sync Hub**: Connector cards (Salla, Zid, Custom ERP), manual sync trigger button, real-time progress indicators, and detailed failure diagnostics logs.
   - **Affiliated Retail Store (ADR-019)**: Affiliation provisioning modal, seller profile status badge, and retail store management.
   - **Settings View**: Supplier code, profile name editing, operational tone selection, and raw configuration JSON editor.

3. **Test Suite (`src/main.test.tsx`)**:
   - Verified locale directions and dictionary parity for `ar` and `en`.
   - Verified dashboard rendering, data fetching, and metric calculations using Vitest and React Testing Library.

---

## Verification Results

### Backend Verification
- `gofmt -s -w .` (Clean, formatted)
- `go vet ./...` (Clean, zero issues)
- `go test -v ./...` (All tests passing across all packages):
  - `internal/coreclient`: PASS (15 unit tests)
  - `internal/supplierapi`: PASS (20 unit tests)
  - `internal/openapi`: PASS (OpenAPI specs deterministic & valid)
  - `internal/auth`, `internal/config`, `internal/httpx`, `internal/i18n`, `internal/money`: PASS
- `go run ./cmd/openapi-gen`: Generated `docs/api/supplier/openapi.json` deterministically.

### Frontend Verification
- `node ../../scripts/check-locales.mjs supplier`: Locale foundation OK (`ar` & `en` matched).
- `npx vitest run`: 2 passing test suites (2 tests passed).
- `npm run typecheck`: TypeScript verification OK (0 errors).
- `npm run build`: Vite production bundle generated cleanly (`dist/` output created in 11.02s).

### Code Quality & Hygiene
- `git diff --check`: Clean (no trailing whitespace or merge conflict markers).
- Phase-name leakage audit: Zero phase-name tokens in new/modified production code.

---

## Known Limitations & Staged Scope
- High-volume CSV batch product import pipeline is deferred to the staged bulk import phase.
- Direct retail capability uses ADR-019 provisioning via Core without modifying retail consumer storefronts.
- Marketplace discovery and merchandising are preserved and untouched per Master Plan PR #72/#74.
