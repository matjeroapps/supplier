// Package supplierapi hosts the Supplier Platform HTTP surface.
//
// Every business capability is a Core-owned runtime call (ADR-017). This package
// owns request parsing, authorization of the authenticated principal, and the
// public response contract; it owns no business rules and no database access.
package supplierapi

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/matjeroapps/supplier/internal/actorhttp"
	"github.com/matjeroapps/supplier/internal/coreclient"
	"github.com/matjeroapps/supplier/internal/httpx"
)

// CoreCapabilities are the Core calls the supplier routes depend on. The
// interface exists so handlers can be tested against a stub Core server.
type CoreCapabilities interface {
	ResolveSupplier(ctx context.Context, subject string) (string, error)
	GetSupplier(ctx context.Context, supplierID, subject string) (coreclient.Supplier, map[string]any, error)
	UpdateSupplierProfile(ctx context.Context, supplierID, subject string, update coreclient.ProfileUpdate) (string, error)
	ListSupplierMarkets(ctx context.Context, supplierID, subject string, page coreclient.Page) ([]coreclient.SupplierMarket, error)
	ListLocations(ctx context.Context, supplierID, subject string, page coreclient.Page) ([]coreclient.FulfillmentLocation, error)
	CreateLocation(ctx context.Context, supplierID, subject string, create coreclient.LocationCreate) (coreclient.FulfillmentLocation, error)
	ListProducts(ctx context.Context, supplierID, subject string, page coreclient.Page) ([]coreclient.SupplierProduct, error)
	CreateProduct(ctx context.Context, supplierID, subject string, create coreclient.ProductCreate) (coreclient.ProductCreateResult, error)
	SetProductCategories(ctx context.Context, supplierID, productID, subject string, categoryIDs []string) ([]string, error)
	CreateVariant(ctx context.Context, supplierID, productID, subject string, create coreclient.VariantCreate) (coreclient.Variant, error)
	CreateSKU(ctx context.Context, supplierID, productID, variantID, subject string, create coreclient.SKUCreate) (coreclient.SKU, error)
	CreateMedia(ctx context.Context, supplierID, productID, subject string, create coreclient.MediaCreate) (coreclient.MediaMetadata, error)
	UpdateMedia(ctx context.Context, supplierID, productID, mediaID, subject string, update coreclient.MediaUpdate) (coreclient.MediaMetadata, error)
	DeleteMedia(ctx context.Context, supplierID, productID, mediaID, subject string) error
	GetPublicationReadiness(ctx context.Context, supplierID, productID, subject string) (coreclient.SupplierPublication, error)
	PublishProduct(ctx context.Context, supplierID, productID, subject string) (coreclient.SupplierPublication, error)
	ListOffers(ctx context.Context, supplierID, subject string, page coreclient.Page) ([]coreclient.SupplierOffer, error)
	CreateOffer(ctx context.Context, supplierID, subject string, create coreclient.OfferCreate) (coreclient.SupplierOffer, error)
	ListInventorySnapshots(ctx context.Context, supplierID, subject string, page coreclient.Page) ([]coreclient.InventorySnapshot, error)
	CreateInventorySnapshot(ctx context.Context, supplierID, subject string, create coreclient.SnapshotCreate) (coreclient.InventorySnapshot, error)
	AdjustInventory(ctx context.Context, supplierID, snapshotID, subject string, adjustment coreclient.InventoryAdjustment) (coreclient.InventoryAdjustmentResult, error)
	ListInventoryMovements(ctx context.Context, supplierID, snapshotID, subject string, page coreclient.Page) ([]coreclient.InventoryMovement, error)
	CreateSupplierSyncJob(ctx context.Context, subject, connectionID, supplierID string) (*coreclient.SupplierSyncJobResponse, error)
	GetSupplierSyncJob(ctx context.Context, subject, jobID string) (*coreclient.SupplierSyncJobResponse, error)
	ListSupplierSyncJobs(ctx context.Context, subject, supplierID string) ([]coreclient.SupplierSyncJobResponse, error)
	// Affiliated retail capability (ADR-019). Wholesale operations remain primary.
	GetSupplierRetailCapability(ctx context.Context, supplierID, subject string) (coreclient.SupplierRetailCapabilityResponse, error)
	CreateSupplierRetailCapability(ctx context.Context, supplierID, subject string, req coreclient.SupplierRetailCapabilityRequest) (coreclient.SupplierRetailCapabilityResponse, error)
	ListSupplierStores(ctx context.Context, supplierID, subject string, page coreclient.Page) ([]coreclient.AffiliatedStore, error)
	CreateSupplierStore(ctx context.Context, supplierID, subject string, req coreclient.SupplierStoreCreateRequest) (coreclient.AffiliatedStore, error)
}

// Dependencies wires the supplier routes.
type Dependencies struct {
	Core CoreCapabilities
}

func RegisterSupplierRoutes(deps Dependencies) func(r chi.Router) {
	return func(r chi.Router) {
		r.Get("/supplier/profile", deps.handleSupplierProfile)
		r.Put("/supplier/profile", deps.handleSupplierProfileUpdate)
		r.Get("/supplier/markets", deps.handleSupplierMarkets)
		r.Get("/supplier/locations", deps.handleSupplierLocations)
		r.Post("/supplier/locations", deps.handleSupplierLocationCreate)
		r.Get("/supplier/products", deps.handleSupplierProducts)
		r.Post("/supplier/products", deps.handleSupplierProductCreate)
		r.Put("/supplier/products/{id}/categories", deps.handleSupplierProductCategories)
		r.Post("/supplier/products/{id}/variants", deps.handleSupplierVariantCreate)
		r.Post("/supplier/products/{id}/variants/{variant_id}/skus", deps.handleSupplierSKUCreate)
		r.Post("/supplier/products/{id}/media", deps.handleSupplierMediaCreate)
		r.Put("/supplier/products/{id}/media/{media_id}", deps.handleSupplierMediaUpdate)
		r.Delete("/supplier/products/{id}/media/{media_id}", deps.handleSupplierMediaDelete)
		r.Get("/supplier/products/{id}/readiness", deps.handleSupplierReadiness)
		r.Post("/supplier/products/{id}/publish", deps.handleSupplierPublish)
		r.Get("/supplier/offers", deps.handleSupplierOffers)
		r.Post("/supplier/offers", deps.handleSupplierOfferCreate)
		r.Get("/supplier/inventory", deps.handleSupplierInventory)
		r.Post("/supplier/inventory/snapshots", deps.handleSupplierInventorySnapshotCreate)
		r.Post("/supplier/inventory/{snapshot_id}/adjustments", deps.handleSupplierInventoryAdjustment)
		r.Get("/supplier/inventory/{snapshot_id}/movements", deps.handleSupplierInventoryMovements)
		r.Post("/supplier/integrations/sync-jobs", deps.handleCreateSupplierSyncJob)
		r.Get("/supplier/integrations/sync-jobs/{id}", deps.handleGetSupplierSyncJob)
		r.Get("/supplier/integrations/sync-jobs", deps.handleListSupplierSyncJobs)
		// Affiliated retail capability (ADR-019) — secondary to wholesale operations.
		r.Get("/supplier/retail-capability", deps.handleGetRetailCapability)
		r.Post("/supplier/retail-capability", deps.handleCreateRetailCapability)
		r.Get("/supplier/stores", deps.handleListStores)
		r.Post("/supplier/stores", deps.handleCreateStore)
	}
}

// supplierID resolves the caller's supplier identity through Core. Core performs
// the resolution from the authenticated subject, so a caller cannot assert its
// own supplier identifier.
func (deps Dependencies) supplierID(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	subject, err := actorhttp.SubjectFrom(r)
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return "", "", false
	}
	supplierID, err := deps.Core.ResolveSupplier(r.Context(), subject)
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return "", "", false
	}
	return subject, supplierID, true
}

func (deps Dependencies) handleSupplierProfile(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	supplier, settings, err := deps.Core.GetSupplier(r.Context(), supplierID, subject)
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, SupplierProfileResponse{Supplier: supplier, Settings: settings})
}

func (deps Dependencies) handleSupplierProfileUpdate(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var body SupplierProfileUpdateRequest
	if !actorhttp.DecodeJSON(w, r, &body) {
		return
	}
	status, err := deps.Core.UpdateSupplierProfile(r.Context(), supplierID, subject, coreclient.ProfileUpdate{
		Name:     body.Name,
		Status:   body.Status,
		Settings: body.Settings,
	})
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": status})
}

func (deps Dependencies) handleSupplierMarkets(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	items, err := deps.Core.ListSupplierMarkets(r.Context(), supplierID, subject, pageFrom(r))
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (deps Dependencies) handleSupplierLocations(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	items, err := deps.Core.ListLocations(r.Context(), supplierID, subject, pageFrom(r))
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (deps Dependencies) handleSupplierLocationCreate(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var body SupplierLocationCreateRequest
	if !actorhttp.DecodeJSON(w, r, &body) {
		return
	}
	location, err := deps.Core.CreateLocation(r.Context(), supplierID, subject, coreclient.LocationCreate{
		SupplierMarketID: body.SupplierMarketID,
		MarketCode:       body.MarketCode,
		Code:             body.Code,
		Name:             body.Name,
		LocationType:     body.LocationType,
		Status:           body.Status,
	})
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, location)
}

func (deps Dependencies) handleSupplierProducts(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	items, err := deps.Core.ListProducts(r.Context(), supplierID, subject, pageFrom(r))
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// handleSupplierProductCreate delegates the whole create sequence to Core: the
// product, its translations, the supplier binding and the category assignments
// are applied together, so a partial failure cannot leave an orphaned product.
func (deps Dependencies) handleSupplierProductCreate(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var body SupplierProductCreateRequest
	if !actorhttp.DecodeJSON(w, r, &body) {
		return
	}

	translations := make([]coreclient.TranslationInput, 0, len(body.Translations))
	for _, translation := range body.Translations {
		translations = append(translations, coreclient.TranslationInput{
			Locale:      translation.Locale,
			Name:        translation.Name,
			Description: translation.Description,
		})
	}

	result, err := deps.Core.CreateProduct(r.Context(), supplierID, subject, coreclient.ProductCreate{
		Slug:         body.Slug,
		Status:       body.Status,
		SupplierCode: body.SupplierCode,
		Translations: translations,
		CategoryIDs:  body.CategoryIDs,
	})
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, ProductCreateResponse{
		Product:         result.Product,
		SupplierProduct: result.SupplierProduct,
	})
}

func (deps Dependencies) handleSupplierProductCategories(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var body SupplierProductCategoriesRequest
	if !actorhttp.DecodeJSON(w, r, &body) {
		return
	}
	categoryIDs, err := deps.Core.SetProductCategories(r.Context(), supplierID, chi.URLParam(r, "id"), subject, body.CategoryIDs)
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"category_ids": categoryIDs})
}

func (deps Dependencies) handleSupplierOffers(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	items, err := deps.Core.ListOffers(r.Context(), supplierID, subject, pageFrom(r))
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// handleSupplierOfferCreate delegates offer creation plus the optional price and
// availability seeding to Core, so the three steps are applied together.
func (deps Dependencies) handleSupplierOfferCreate(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var body SupplierOfferCreateRequest
	if !actorhttp.DecodeJSON(w, r, &body) {
		return
	}
	offer, err := deps.Core.CreateOffer(r.Context(), supplierID, subject, coreclient.OfferCreate{
		SupplierProductID: body.SupplierProductID,
		SupplierMarketID:  body.SupplierMarketID,
		MarketCode:        body.MarketCode,
		Status:            body.Status,
		MinimumOrderQty:   firstPositive(body.MinimumOrderQty, body.MinOrderQuantity),
		Price:             body.Price,
		IsAvailable:       body.IsAvailable,
		AvailableQty:      body.AvailableQty,
	})
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, offer)
}

func firstPositive(values ...int64) int64 {
	for _, value := range values {
		if value > 0 {
			return value
		}
	}
	return 1
}

func (deps Dependencies) handleSupplierVariantCreate(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var body SupplierVariantCreateRequest
	if !actorhttp.DecodeJSON(w, r, &body) {
		return
	}
	variant, err := deps.Core.CreateVariant(r.Context(), supplierID, chi.URLParam(r, "id"), subject, coreclient.VariantCreate{Code: body.Code, Status: body.Status})
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, variant)
}

func (deps Dependencies) handleSupplierSKUCreate(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var body SupplierSKUCreateRequest
	if !actorhttp.DecodeJSON(w, r, &body) {
		return
	}
	sku, err := deps.Core.CreateSKU(r.Context(), supplierID, chi.URLParam(r, "id"), chi.URLParam(r, "variant_id"), subject, coreclient.SKUCreate{Code: body.Code, Barcode: body.Barcode, Status: body.Status})
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, sku)
}

func (deps Dependencies) handleSupplierMediaCreate(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var body SupplierMediaCreateRequest
	if !actorhttp.DecodeJSON(w, r, &body) {
		return
	}
	media, err := deps.Core.CreateMedia(r.Context(), supplierID, chi.URLParam(r, "id"), subject, coreclient.MediaCreate{
		MediaType: body.MediaType, URI: body.URI, AltText: body.AltText, SortOrder: body.SortOrder, StorageKey: body.StorageKey, IsPrimary: body.IsPrimary,
	})
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, media)
}

func (deps Dependencies) handleSupplierMediaUpdate(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var body SupplierMediaUpdateRequest
	if !actorhttp.DecodeJSON(w, r, &body) {
		return
	}
	media, err := deps.Core.UpdateMedia(r.Context(), supplierID, chi.URLParam(r, "id"), chi.URLParam(r, "media_id"), subject, coreclient.MediaUpdate{AltText: body.AltText, SortOrder: body.SortOrder, IsPrimary: body.IsPrimary})
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, media)
}

func (deps Dependencies) handleSupplierMediaDelete(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	if err := deps.Core.DeleteMedia(r.Context(), supplierID, chi.URLParam(r, "id"), chi.URLParam(r, "media_id"), subject); err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (deps Dependencies) handleSupplierReadiness(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	readiness, err := deps.Core.GetPublicationReadiness(r.Context(), supplierID, chi.URLParam(r, "id"), subject)
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, readiness)
}

func (deps Dependencies) handleSupplierPublish(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	publication, err := deps.Core.PublishProduct(r.Context(), supplierID, chi.URLParam(r, "id"), subject)
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, publication)
}

func (deps Dependencies) handleSupplierInventory(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	items, err := deps.Core.ListInventorySnapshots(r.Context(), supplierID, subject, pageFrom(r))
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// handleSupplierInventorySnapshotCreate delegates to Core, which verifies the
// target fulfillment location belongs to the authenticated supplier before
// creating the snapshot.
func (deps Dependencies) handleSupplierInventorySnapshotCreate(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var body InventorySnapshotCreateRequest
	if !actorhttp.DecodeJSON(w, r, &body) {
		return
	}
	snapshot, err := deps.Core.CreateInventorySnapshot(r.Context(), supplierID, subject, coreclient.SnapshotCreate{
		FulfillmentLocationID: body.FulfillmentLocationID,
		SKUID:                 body.SKUID,
		OnHandQty:             body.OnHandQty,
	})
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, snapshot)
}

func (deps Dependencies) handleSupplierInventoryAdjustment(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var body InventoryAdjustmentRequest
	if !actorhttp.DecodeJSON(w, r, &body) {
		return
	}
	result, err := deps.Core.AdjustInventory(r.Context(), supplierID, chi.URLParam(r, "snapshot_id"), subject, coreclient.InventoryAdjustment{
		QuantityDelta: body.QuantityDelta,
		MovementType:  body.MovementType,
		Reason:        body.Reason,
	})
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, InventoryAdjustmentResponse{
		Snapshot: result.Snapshot,
		Movement: result.Movement,
	})
}

func (deps Dependencies) handleSupplierInventoryMovements(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	items, err := deps.Core.ListInventoryMovements(r.Context(), supplierID, chi.URLParam(r, "snapshot_id"), subject, pageFrom(r))
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// pageFrom converts the shared pagination window into the Core client's shape.
func pageFrom(r *http.Request) coreclient.Page {
	page := actorhttp.ParsePage(r)
	return coreclient.Page{Limit: page.Limit, Offset: page.Offset}
}

// --- Affiliated retail capability handlers (ADR-019) ---

func (deps Dependencies) handleGetRetailCapability(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	result, err := deps.Core.GetSupplierRetailCapability(r.Context(), supplierID, subject)
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result)
}

func (deps Dependencies) handleCreateRetailCapability(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var req SupplierRetailCapabilityRequest
	if !actorhttp.DecodeJSON(w, r, &req) {
		return
	}
	result, err := deps.Core.CreateSupplierRetailCapability(r.Context(), supplierID, subject, coreclient.SupplierRetailCapabilityRequest{
		Code: req.Code,
		Name: req.Name,
	})
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, result)
}

func (deps Dependencies) handleListStores(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	items, err := deps.Core.ListSupplierStores(r.Context(), supplierID, subject, pageFrom(r))
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (deps Dependencies) handleCreateStore(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var req SupplierStoreCreateRequest
	if !actorhttp.DecodeJSON(w, r, &req) {
		return
	}
	store, err := deps.Core.CreateSupplierStore(r.Context(), supplierID, subject, coreclient.SupplierStoreCreateRequest{
		MarketCode: req.MarketCode,
		Code:       req.Code,
		Name:       req.Name,
	})
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, store)
}
