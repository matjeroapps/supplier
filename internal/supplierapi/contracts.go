package supplierapi

import (
	"github.com/matjeroapps/core/packages/money"
	"github.com/matjeroapps/core/pkg/commerce"
)

type SupplierProfileResponse struct {
	Supplier commerce.Supplier `json:"supplier"`
	Settings map[string]any    `json:"settings"`
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
	Product         commerce.Product         `json:"product"`
	SupplierProduct commerce.SupplierProduct `json:"supplier_product"`
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
	Snapshot commerce.InventorySnapshot `json:"snapshot"`
	Movement commerce.InventoryMovement `json:"movement"`
}
