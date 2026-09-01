package coreclient

import (
	"context"
	"net/url"
	"time"

	"github.com/matjeroapps/supplier/internal/money"
)

// Supplier DTOs.
//
// These are Supplier-owned wire shapes for Core-owned business data. The field
// sets and JSON shapes match the public contract the Supplier API has always
// published; changing one is a public contract change, not a client detail.

// Supplier is a supplier profile.
type Supplier struct {
	ID        string    `json:"id"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SupplierMarket is a supplier's registration in a market.
type SupplierMarket struct {
	ID         string         `json:"id"`
	SupplierID string         `json:"supplier_id"`
	MarketCode string         `json:"market_code"`
	Status     string         `json:"status"`
	Settings   map[string]any `json:"settings"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
}

// FulfillmentLocation is a supplier's stocking location.
type FulfillmentLocation struct {
	SupplierID       string    `json:"supplier_id"`
	ID               string    `json:"id"`
	SupplierMarketID string    `json:"supplier_market_id"`
	MarketCode       string    `json:"market_code"`
	Code             string    `json:"code"`
	Name             string    `json:"name"`
	LocationType     string    `json:"location_type"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// Product is a global catalog product.
type Product struct {
	ID        string    `json:"id"`
	Slug      string    `json:"slug"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SupplierProduct binds a product to a supplier.
type SupplierProduct struct {
	ID           string    `json:"id"`
	SupplierID   string    `json:"supplier_id"`
	ProductID    string    `json:"product_id"`
	SupplierCode string    `json:"supplier_code"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// SupplierOffer is a supplier's offer of a product in a market.
type SupplierOffer struct {
	ID                string    `json:"id"`
	SupplierID        string    `json:"supplier_id"`
	SupplierProductID string    `json:"supplier_product_id"`
	SupplierMarketID  string    `json:"supplier_market_id"`
	MarketCode        string    `json:"market_code"`
	Status            string    `json:"status"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// InventorySnapshot is a stock position for a SKU at a location.
type InventorySnapshot struct {
	ID                    string    `json:"id"`
	FulfillmentLocationID string    `json:"fulfillment_location_id"`
	SKUID                 string    `json:"sku_id"`
	OnHandQty             int64     `json:"on_hand_qty"`
	ReservedQty           int64     `json:"reserved_qty"`
	Version               int64     `json:"version"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

// InventoryMovement is a stock movement against a snapshot.
type InventoryMovement struct {
	ID                  string    `json:"id"`
	InventorySnapshotID string    `json:"inventory_snapshot_id"`
	MovementType        string    `json:"movement_type"`
	QuantityDelta       int64     `json:"quantity_delta"`
	OnHandQty           int64     `json:"on_hand_qty"`
	ReservedQty         int64     `json:"reserved_qty"`
	Reason              string    `json:"reason"`
	PrincipalSubject    string    `json:"principal_subject"`
	CorrelationID       string    `json:"correlation_id"`
	CausationID         string    `json:"causation_id"`
	CreatedAt           time.Time `json:"created_at"`
}

// --- Request payloads ---

// ProfileUpdate is the supplier profile mutation payload.
type ProfileUpdate struct {
	Name     string         `json:"name"`
	Status   string         `json:"status"`
	Settings map[string]any `json:"settings"`
}

// LocationCreate registers a fulfillment location.
type LocationCreate struct {
	SupplierMarketID string `json:"supplier_market_id"`
	MarketCode       string `json:"market_code"`
	Code             string `json:"code"`
	Name             string `json:"name"`
	LocationType     string `json:"location_type"`
	Status           string `json:"status"`
}

// TranslationInput is a localized product name/description.
type TranslationInput struct {
	Locale      string `json:"locale"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// ProductCreate creates a product, its translations, the supplier binding, and
// its category assignments in one Core call.
type ProductCreate struct {
	Slug         string             `json:"slug"`
	Status       string             `json:"status"`
	SupplierCode string             `json:"supplier_code"`
	Translations []TranslationInput `json:"translations"`
	CategoryIDs  []string           `json:"category_ids"`
}

// ProductCreateResult returns both the global product and the supplier binding.
type ProductCreateResult struct {
	Product         Product         `json:"product"`
	SupplierProduct SupplierProduct `json:"supplier_product"`
}

// ProductCategories replaces a product's category assignments.
type ProductCategories struct {
	CategoryIDs []string `json:"category_ids"`
}

// ProductCategoriesResult echoes the applied category identifiers.
type ProductCategoriesResult struct {
	CategoryIDs []string `json:"category_ids"`
}

// OfferCreate creates an offer and optionally seeds its price and availability.
type OfferCreate struct {
	SupplierProductID string       `json:"supplier_product_id"`
	SupplierMarketID  string       `json:"supplier_market_id"`
	MarketCode        string       `json:"market_code"`
	Status            string       `json:"status"`
	Price             *money.Money `json:"price"`
	IsAvailable       *bool        `json:"is_available"`
	AvailableQty      *int64       `json:"available_qty"`
}

// SnapshotCreate opens an inventory snapshot.
type SnapshotCreate struct {
	FulfillmentLocationID string `json:"fulfillment_location_id"`
	SKUID                 string `json:"sku_id"`
	OnHandQty             int64  `json:"on_hand_qty"`
}

// InventoryAdjustment applies a stock movement.
type InventoryAdjustment struct {
	QuantityDelta int64  `json:"quantity_delta"`
	MovementType  string `json:"movement_type"`
	Reason        string `json:"reason"`
}

// InventoryAdjustmentResult returns the updated snapshot and the movement.
type InventoryAdjustmentResult struct {
	Snapshot InventorySnapshot `json:"snapshot"`
	Movement InventoryMovement `json:"movement"`
}

// --- Response envelopes ---

type supplierResolveResponse struct {
	SupplierID string `json:"supplier_id"`
}

type supplierProfileResponse struct {
	Supplier Supplier       `json:"supplier"`
	Settings map[string]any `json:"settings"`
}

// --- Supplier capabilities ---
//
// Business identity is always resolved by Core from the forwarded subject. A
// caller cannot assert its own supplier identifier: the supplierID path segment
// is checked against the resolved identity, and a mismatch is a safe not-found.

// ResolveSupplier maps an authenticated subject to its supplier identity.
func (c *Client) ResolveSupplier(ctx context.Context, subject string) (string, error) {
	var payload supplierResolveResponse
	err := c.get(ctx, "/internal/v1/suppliers/resolve", nil, requestOptions{Subject: subject}, &payload)
	return payload.SupplierID, err
}

// GetSupplier returns a supplier profile and settings.
func (c *Client) GetSupplier(ctx context.Context, supplierID, subject string) (Supplier, map[string]any, error) {
	var payload supplierProfileResponse
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID)
	err := c.get(ctx, path, nil, requestOptions{Subject: subject}, &payload)
	return payload.Supplier, payload.Settings, err
}

// UpdateSupplierProfile updates a supplier profile.
func (c *Client) UpdateSupplierProfile(ctx context.Context, supplierID, subject string, update ProfileUpdate) (string, error) {
	var payload statusResponse
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID) + "/profile"
	err := c.put(ctx, path, update, requestOptions{Subject: subject}, &payload)
	return payload.Status, err
}

// ListSupplierMarkets lists a supplier's market registrations.
func (c *Client) ListSupplierMarkets(ctx context.Context, supplierID, subject string, page Page) ([]SupplierMarket, error) {
	var payload collectionResponse[SupplierMarket]
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID) + "/markets"
	err := c.get(ctx, path, page.values(), requestOptions{Subject: subject}, &payload)
	return payload.Items, err
}

// ListLocations lists a supplier's fulfillment locations.
func (c *Client) ListLocations(ctx context.Context, supplierID, subject string, page Page) ([]FulfillmentLocation, error) {
	var payload collectionResponse[FulfillmentLocation]
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID) + "/locations"
	err := c.get(ctx, path, page.values(), requestOptions{Subject: subject}, &payload)
	return payload.Items, err
}

// CreateLocation registers a fulfillment location for the authenticated supplier.
func (c *Client) CreateLocation(ctx context.Context, supplierID, subject string, create LocationCreate) (FulfillmentLocation, error) {
	var payload FulfillmentLocation
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID) + "/locations"
	err := c.post(ctx, path, create, requestOptions{Subject: subject}, &payload)
	return payload, err
}

// ListProducts lists a supplier's products.
func (c *Client) ListProducts(ctx context.Context, supplierID, subject string, page Page) ([]SupplierProduct, error) {
	var payload collectionResponse[SupplierProduct]
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID) + "/products"
	err := c.get(ctx, path, page.values(), requestOptions{Subject: subject}, &payload)
	return payload.Items, err
}

// CreateProduct creates a product with its translations, supplier binding and
// categories in a single Core call, so the sequence cannot be left half-applied.
func (c *Client) CreateProduct(ctx context.Context, supplierID, subject string, create ProductCreate) (ProductCreateResult, error) {
	var payload ProductCreateResult
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID) + "/products"
	err := c.post(ctx, path, create, requestOptions{Subject: subject}, &payload)
	return payload, err
}

// SetProductCategories replaces a product's category assignments.
func (c *Client) SetProductCategories(ctx context.Context, supplierID, productID, subject string, categoryIDs []string) ([]string, error) {
	var payload ProductCategoriesResult
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID) + "/products/" + url.PathEscape(productID) + "/categories"
	err := c.put(ctx, path, ProductCategories{CategoryIDs: categoryIDs}, requestOptions{Subject: subject}, &payload)
	return payload.CategoryIDs, err
}

// ListOffers lists a supplier's offers.
func (c *Client) ListOffers(ctx context.Context, supplierID, subject string, page Page) ([]SupplierOffer, error) {
	var payload collectionResponse[SupplierOffer]
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID) + "/offers"
	err := c.get(ctx, path, page.values(), requestOptions{Subject: subject}, &payload)
	return payload.Items, err
}

// CreateOffer creates an offer and optionally seeds its price and availability.
func (c *Client) CreateOffer(ctx context.Context, supplierID, subject string, create OfferCreate) (SupplierOffer, error) {
	var payload SupplierOffer
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID) + "/offers"
	err := c.post(ctx, path, create, requestOptions{Subject: subject}, &payload)
	return payload, err
}

// ListInventorySnapshots lists a supplier's inventory snapshots.
func (c *Client) ListInventorySnapshots(ctx context.Context, supplierID, subject string, page Page) ([]InventorySnapshot, error) {
	var payload collectionResponse[InventorySnapshot]
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID) + "/inventory"
	err := c.get(ctx, path, page.values(), requestOptions{Subject: subject}, &payload)
	return payload.Items, err
}

// CreateInventorySnapshot opens a snapshot. Core verifies the target location
// belongs to the authenticated supplier before creating it.
func (c *Client) CreateInventorySnapshot(ctx context.Context, supplierID, subject string, create SnapshotCreate) (InventorySnapshot, error) {
	var payload InventorySnapshot
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID) + "/inventory/snapshots"
	err := c.post(ctx, path, create, requestOptions{Subject: subject}, &payload)
	return payload, err
}

// AdjustInventory applies a stock movement.
func (c *Client) AdjustInventory(ctx context.Context, supplierID, snapshotID, subject string, adjustment InventoryAdjustment) (InventoryAdjustmentResult, error) {
	var payload InventoryAdjustmentResult
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID) + "/inventory/" + url.PathEscape(snapshotID) + "/adjustments"
	err := c.post(ctx, path, adjustment, requestOptions{Subject: subject}, &payload)
	return payload, err
}

// ListInventoryMovements lists the movements recorded against a snapshot.
func (c *Client) ListInventoryMovements(ctx context.Context, supplierID, snapshotID, subject string, page Page) ([]InventoryMovement, error) {
	var payload collectionResponse[InventoryMovement]
	path := "/internal/v1/suppliers/" + url.PathEscape(supplierID) + "/inventory/" + url.PathEscape(snapshotID) + "/movements"
	err := c.get(ctx, path, page.values(), requestOptions{Subject: subject}, &payload)
	return payload.Items, err
}
