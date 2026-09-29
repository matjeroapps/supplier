# Objective

Establish the first real Supplier catalog publication path while keeping Core authoritative for canonical commerce state and Supplier as a subject-preserving BFF/client of Core.

# Roadmap Task

M1-01 — Live Supplier Catalog Publication, as defined in `core/docs/plans/matjerhub-first-real-merchant-roadmap.md`.

# Baseline SHAs

The implementation branches were created directly from the following `origin/main` commits:

- Core: `a6ea88e4b4edc28ba766a6e54d8c8c382a4fc3cf`
- Supplier: `6339f4875e7497fcda8cc0c917b31bb6f98bf005`
- Seller: `2d36528b4aac79f69ef93bcb0ede36730d48c7cc`
- platform-infra (read-only baseline): `dae8e6d929250c928ebcb8efa5e4106be6fecf9c`

# Repositories Changed

- `core`: canonical MOQ, supplier publication/readiness, authoring routes, and published supplier discovery/import guards.
- `supplier`: Core client/BFF routes and minimal existing authoring-workspace wiring.
- `seller`: supplier discovery DTO and display of MOQ/SKU/media facts.
- `platform-infra`: no changes.

# Existing Capabilities Reused

The implementation reuses the existing M0-01/M0-02 boundaries and entities:

- Core owns products, supplier products, variants, SKUs, categories, markets, offers, prices, availability, locations, media metadata, and authorization.
- Supplier resolves the authenticated subject and delegates to Core with the verified subject/service-auth headers.
- Existing supplier profile, market, location, product, translation, category, offer, price, and availability APIs remain in place.
- Existing code-first OpenAPI generators were used; generated specifications were not manually authored.
- Seller continues to own retail listing/presentation state; only supplier facts are added to its discovery DTO.

# Implementation

Core now provides supplier-scoped operations for variant creation, SKU creation, media metadata maintenance, server-side readiness evaluation, and atomic publication. Publication locks the product transactionally, verifies required translation/category/SKU/primary-media/offer/price/availability facts, then moves the product to `published` and the supplier product to `active`.

Supplier exposes BFF routes for those Core operations and does not accept supplier ID, tenant ID, readiness, or publication status as authoritative browser input. The existing Supplier workspace now attempts variant/SKU creation after product creation and uses the Core-backed media metadata endpoints for media/primary-media actions.

Seller discovery DTOs now carry MOQ, SKU lineage, and primary-media lineage. Core catalog listing and import reject inactive offers/supplier products and reject products outside the existing active/published product states.

# API Changes

Core internal supplier routes added:

- `POST /internal/v1/suppliers/{supplierID}/products/{productID}/variants`
- `POST /internal/v1/suppliers/{supplierID}/products/{productID}/variants/{variantID}/skus`
- `POST /internal/v1/suppliers/{supplierID}/products/{productID}/media`
- `PUT /internal/v1/suppliers/{supplierID}/products/{productID}/media/{mediaID}`
- `DELETE /internal/v1/suppliers/{supplierID}/products/{productID}/media/{mediaID}`
- `GET /internal/v1/suppliers/{supplierID}/products/{productID}/readiness`
- `POST /internal/v1/suppliers/{supplierID}/products/{productID}/publish`

Supplier BFF routes mirror those operations below `/v1/supplier/products/{productID}`. Supplier offer creation accepts `minimum_order_quantity` (with the existing compatibility alias `min_order_quantity`).

Generated OpenAPI files were regenerated in Core, Supplier, and Seller.

# Database/Migrations

Core migration `migrations/000033_supplier_catalog_publication.up.sql` adds `supplier_offers.minimum_order_quantity` as a positive, non-null integer with a default of `1`. The down migration removes the constraint and column.

# Media

Supplier media metadata is scoped through the Core supplier/product ownership joins. Primary-media selection is server-side and product-scoped.

The existing media intent/completion/MinIO upload workflow was not generalized in this change. The current authoring UI sends object URLs and metadata to the new Core route; real object-storage upload/completion remains a known limitation and is not claimed as live-verified.

# Offers

Offer MOQ is persisted as a typed positive integer and returned through Core catalog discovery. Existing market, currency, price, status, and supplier ownership paths remain Core-owned. Browser-provided supplier/tenant/readiness values are not trusted.

# Inventory

Existing Core supplier-offer availability and location/inventory ownership paths are reused. Readiness requires positive available inventory through the existing availability representation; no duplicate inventory model was introduced.

# Publish/Readiness

Readiness is evaluated in Core, not in the browser. Publication is transactionally serialized on the product row and re-evaluates readiness before changing canonical status. Seller discovery/import only accepts active supplier offers and active/published products.

# Security

- Supplier IDs continue to be resolved from the verified authenticated subject.
- Supplier product operations join through supplier ownership and product lineage.
- Core remains the authorization boundary; Supplier does not access Core PostgreSQL or import Core Go packages.
- Cross-supplier and cross-tenant behavior was not live-exercised because the Docker-backed environment was unavailable.

# Verification

Passed:

- Core: compact full suite `GOMAXPROCS=2 go test -p 1 -count=1 -timeout=20m ./...`, `gofmt`, `go vet ./...`, focused race tests, and `make openapi-check`. Static security review covered subject-derived ownership, service-auth boundaries, SQL parameterization, and server-side readiness.
- Supplier: compact full Go suite `GOMAXPROCS=2 go test -p 1 -count=1 -timeout=10m ./...`, `gofmt`, `go vet ./...`, focused race tests, `make openapi-check`, `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build --workspaces --if-present`. Static security review covered BFF authority boundaries and error delegation.
- Seller: compact full Go suite `GOMAXPROCS=2 go test -p 1 -count=1 -timeout=15m ./...`, `gofmt`, `go vet ./...`, focused race tests, `make openapi-check`, and the complete workspace lint/typecheck/test/build commands.
- Code-first OpenAPI generators completed and generated documents changed with the route/model additions.

The repository `openapi-check` targets compare generated files with the committed baseline; after the final commits, `make openapi-check` passed in Core, Supplier, and Seller.

The Codex Security diff-scan worker was started for Core, but its discovery artifact was unavailable in this environment; no security PASS is claimed from that worker.

Remote CI is not green because GitHub Actions did not start the jobs. The check annotations state: `The job was not started because recent account payments have failed or your spending limit needs to be increased.` This is an external repository-account billing blocker, not a test result.

# Live Infrastructure Verification

Partial infrastructure verification passed:

- Docker Engine `29.6.1` was available.
- PostgreSQL container recovered from an interrupted database start and became healthy.
- MinIO live/ready endpoints returned HTTP 200.
- PostgreSQL, Redis, and RabbitMQ containers were running.

NOT VERIFIED — ENVIRONMENT LIMITATION

`make up-all` was attempted against the real stack. The application build did not complete within the available run and was interrupted while building platform services; `docker compose --no-build` then confirmed that required application images such as `matjerhub-general-worker:latest` were unavailable. Core, Supplier, Seller, Zitadel HTTP readiness, RabbitMQ management, MinIO bucket verification, and the end-to-end publication workflow therefore remain unverified. No mocked workflow is reported as live verification.

# Failure-Path Verification

Static and unit coverage passed for the changed Core/Supplier/Seller packages. Platform-infra probes recorded PASS for MinIO health and the PostgreSQL/Redis/RabbitMQ containers, while application and management endpoints were unavailable. Dedicated M1-01 two-tenant integration probes, real media intent/completion retries, concurrent live publication, and infrastructure-interruption scenarios remain NOT VERIFIED because the application stack did not become runnable and dedicated new integration fixtures were not added in this increment.

# Known Limitations

- Real MinIO/S3 media intent/upload/completion is not part of this increment; current Supplier UI wiring stores media metadata/object URLs through the Core metadata route.
- The UI/UX Pro Max command was attempted but `uipro` was not installed (`command not found`), so no new guided visual workspace was designed; only minimal wiring was made to the existing workspace.
- No Seller Import implementation was added.
- No live cross-service or E2E evidence is available until Docker services can be started.
- Completion remains conditional until GitHub Actions billing/spending-limit remediation allows all PR checks to run and pass.

# Files Changed

Core:

- `migrations/000033_supplier_catalog_publication.up.sql`
- `migrations/000033_supplier_catalog_publication.down.sql`
- `modules/commerce/models.go`
- `modules/commerce/platform_types.go`
- `modules/commerce/platform_repository.go`
- `modules/commerce/repository.go`
- `modules/commerce/seller_catalog_repository.go`
- `modules/commerce/supplier_composites.go`
- `modules/commerce/supplier_publication.go`
- `internal/coreapi/contracts.go`
- `internal/coreapi/router.go`
- `internal/coreapi/spec.go`
- `internal/coreapi/suppliers.go`
- `docs/api/internal/openapi.json`

Supplier:

- `internal/coreclient/suppliers.go`
- `internal/openapi/specs.go`
- `internal/supplierapi/contracts.go`
- `internal/supplierapi/router.go`
- `internal/supplierapi/router_test.go`
- `web/supplier/src/main.tsx`
- `docs/api/supplier/openapi.json`

Seller:

- `internal/coreclient/sellers.go`
- `web/seller/lib/api/types.ts`
- `web/seller/app/(dashboard)/dashboard/stores/[store_id]/catalog/supplier-offers/page.tsx`
- `docs/api/seller/openapi.json`

# PR Information

Branches:

- `core`: `feature/m1-01-live-supplier-catalog-publication`
- `supplier`: `feature/m1-01-live-supplier-catalog-publication`
- `seller`: `feature/m1-01-live-supplier-catalog-publication`

Final commit SHAs and PR URLs are added after the final diff checks and commits. No PR is merged automatically.

Final commits:

- Core: `2895321`
- Supplier implementation: `3b9cedb`; report reconciliation commits: `f7d831a`, `8c04cbe`
- Seller: `8ff5542`

Pull requests:

- Core: https://github.com/matjeroapps/core/pull/76
- Supplier: https://github.com/matjeroapps/supplier/pull/15
- Seller: https://github.com/matjeroapps/seller/pull/37

All three PRs target `main` and remain unmerged.
