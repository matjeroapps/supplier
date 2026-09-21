package supplierapi

import (
	"github.com/matjeroapps/supplier/internal/coreclient"
	"github.com/matjeroapps/supplier/internal/money"
)

// Public request and response contracts for the Supplier API.
//
// These are owned by this repository. They are deliberately not the Core wire
// shapes: the public contract is governed here, so a Core change cannot silently
// alter what a supplier-facing client sees.

type SupplierProfileResponse struct {
	Supplier coreclient.Supplier `json:"supplier"`
	Settings map[string]any      `json:"settings"`
}

type SupplierProfileUpdateRequest struct {
	Name     string         `json:"name"`
	Status   string         `json:"status"`
	Settings map[string]any `json:"settings"`
}

type SupplierLocationCreateRequest struct {
	SupplierMarketID string `json:"supplier_market_id"`
	MarketCode       string `json:"market_code"`
	Code             string `json:"code"`
	Name             string `json:"name"`
	LocationType     string `json:"location_type"`
	Status           string `json:"status"`
}

type SupplierProductTranslationRequest struct {
	Locale      string `json:"locale"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type SupplierProductCreateRequest struct {
	Slug         string                              `json:"slug"`
	Status       string                              `json:"status"`
	SupplierCode string                              `json:"supplier_code"`
	Translations []SupplierProductTranslationRequest `json:"translations"`
	CategoryIDs  []string                            `json:"category_ids"`
}

type SupplierProductCategoriesRequest struct {
	CategoryIDs []string `json:"category_ids"`
}

type SupplierOfferCreateRequest struct {
	SupplierProductID string       `json:"supplier_product_id"`
	SupplierMarketID  string       `json:"supplier_market_id"`
	MarketCode        string       `json:"market_code"`
	Status            string       `json:"status"`
	Price             *money.Money `json:"price"`
	IsAvailable       *bool        `json:"is_available"`
	AvailableQty      *int64       `json:"available_qty"`
}

type ProductCreateResponse struct {
	Product         coreclient.Product         `json:"product"`
	SupplierProduct coreclient.SupplierProduct `json:"supplier_product"`
}

type InventorySnapshotCreateRequest struct {
	FulfillmentLocationID string `json:"fulfillment_location_id"`
	SKUID                 string `json:"sku_id"`
	OnHandQty             int64  `json:"on_hand_qty"`
}

type InventoryAdjustmentRequest struct {
	QuantityDelta int64  `json:"quantity_delta"`
	MovementType  string `json:"movement_type"`
	Reason        string `json:"reason"`
}

type InventoryAdjustmentResponse struct {
	Snapshot coreclient.InventorySnapshot `json:"snapshot"`
	Movement coreclient.InventoryMovement `json:"movement"`
}

type CreateSyncJobRequest struct {
	ConnectionID string `json:"connection_id"`
	SupplierID   string `json:"supplier_id"`
}

type SupplierSyncJobResponse struct {
	ID             string `json:"id"`
	ConnectionID   string `json:"connection_id"`
	SupplierID     string `json:"supplier_id"`
	Status         string `json:"status"`
	TotalItems     int    `json:"total_items"`
	ProcessedItems int    `json:"processed_items"`
	FailedItems    int    `json:"failed_items"`
	ErrorSummary   string `json:"error_summary,omitempty"`
}

// SupplierRetailCapabilityRequest is the public contract for provisioning
// an affiliated direct retail seller (ADR-019).
type SupplierRetailCapabilityRequest struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

// SupplierRetailCapabilityResponse is returned by GET/POST /retail-capability.
type SupplierRetailCapabilityResponse struct {
	Affiliation struct {
		SupplierID string `json:"supplier_id"`
		SellerID   string `json:"seller_id"`
	} `json:"affiliation"`
	Seller struct {
		ID     string `json:"id"`
		Code   string `json:"code"`
		Name   string `json:"name"`
		Status string `json:"status"`
	} `json:"seller"`
}

// SupplierStoreCreateRequest creates an affiliated direct retail store.
type SupplierStoreCreateRequest struct {
	MarketCode string `json:"market_code"`
	Code       string `json:"code"`
	Name       string `json:"name"`
}
