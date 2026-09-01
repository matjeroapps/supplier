package openapi

import (
	"net/http"

	"github.com/getkin/kin-openapi/openapi3"

	"github.com/matjeroapps/supplier/internal/contracts"
	"github.com/matjeroapps/supplier/internal/coreclient"
	"github.com/matjeroapps/supplier/internal/supplierapi"
)

func BuildSupplierSpec() (*openapi3.T, error) {
	return BuildDocument(DocumentSpec{
		Title:         "Matjero Supplier API",
		Description:   "OpenAPI contract for the Matjero Supplier API.",
		Authenticated: true,
		Tags:          CommonTags(),
		Routes:        append(ActorRoutes(true), supplierRoutes()...),
	})
}

func supplierRoutes() []RouteSpec {
	return []RouteSpec{
		{
			Method:      http.MethodGet,
			Path:        "/v1/supplier/profile",
			OperationID: "getSupplierProfile",
			Summary:     "Get the supplier profile",
			Tags:        []string{"Suppliers"},
			Auth:        true,
			Responses:   AuthReadResponses("Supplier profile", supplierapi.SupplierProfileResponse{}),
		},
		{
			Method:      http.MethodPut,
			Path:        "/v1/supplier/profile",
			OperationID: "updateSupplierProfile",
			Summary:     "Update the supplier profile",
			Tags:        []string{"Suppliers"},
			Auth:        true,
			RequestBody: supplierapi.SupplierProfileUpdateRequest{},
			Responses:   AuthOKResponses("Supplier profile updated", contracts.StatusResponse{}),
		},
		{
			Method:      http.MethodGet,
			Path:        "/v1/supplier/markets",
			OperationID: "listSupplierMarkets",
			Summary:     "List supplier markets",
			Tags:        []string{"Markets"},
			Auth:        true,
			Parameters:  []ParameterSpec{LimitParam(), OffsetParam()},
			Responses:   ListResponses[coreclient.SupplierMarket]("Supplier market collection"),
		},
		{
			Method:      http.MethodGet,
			Path:        "/v1/supplier/locations",
			OperationID: "listSupplierLocations",
			Summary:     "List fulfillment locations",
			Tags:        []string{"Fulfillment Locations"},
			Auth:        true,
			Parameters:  []ParameterSpec{LimitParam(), OffsetParam()},
			Responses:   ListResponses[coreclient.FulfillmentLocation]("Fulfillment location collection"),
		},
		{
			Method:      http.MethodPost,
			Path:        "/v1/supplier/locations",
			OperationID: "createSupplierLocation",
			Summary:     "Create a fulfillment location",
			Tags:        []string{"Fulfillment Locations"},
			Auth:        true,
			RequestBody: supplierapi.SupplierLocationCreateRequest{},
			Responses:   AuthCreatedResponses("Fulfillment location created", coreclient.FulfillmentLocation{}),
		},
		{
			Method:      http.MethodGet,
			Path:        "/v1/supplier/products",
			OperationID: "listSupplierProducts",
			Summary:     "List supplier products",
			Tags:        []string{"Catalog"},
			Auth:        true,
			Parameters:  []ParameterSpec{LimitParam(), OffsetParam()},
			Responses:   ListResponses[coreclient.SupplierProduct]("Supplier product collection"),
		},
		{
			Method:      http.MethodPost,
			Path:        "/v1/supplier/products",
			OperationID: "createSupplierProduct",
			Summary:     "Create a supplier product",
			Tags:        []string{"Catalog", "Categories", "Attributes", "Variants", "SKUs"},
			Auth:        true,
			RequestBody: supplierapi.SupplierProductCreateRequest{},
			Responses:   AuthCreatedResponses("Supplier product created", supplierapi.ProductCreateResponse{}),
		},
		{
			Method:      http.MethodPut,
			Path:        "/v1/supplier/products/{id}/categories",
			OperationID: "setSupplierProductCategories",
			Summary:     "Update supplier product categories",
			Tags:        []string{"Categories"},
			Auth:        true,
			Parameters:  []ParameterSpec{PathStringParam("id", "Product identifier")},
			RequestBody: supplierapi.SupplierProductCategoriesRequest{},
			Responses:   AuthOKResponses("Supplier product categories updated", supplierapi.SupplierProductCategoriesRequest{}),
		},
		{
			Method:      http.MethodGet,
			Path:        "/v1/supplier/offers",
			OperationID: "listSupplierOffers",
			Summary:     "List supplier offers",
			Tags:        []string{"Supplier Offers"},
			Auth:        true,
			Parameters:  []ParameterSpec{LimitParam(), OffsetParam()},
			Responses:   ListResponses[coreclient.SupplierOffer]("Supplier offer collection"),
		},
		{
			Method:      http.MethodPost,
			Path:        "/v1/supplier/offers",
			OperationID: "createSupplierOffer",
			Summary:     "Create a supplier offer",
			Tags:        []string{"Supplier Offers"},
			Auth:        true,
			RequestBody: supplierapi.SupplierOfferCreateRequest{},
			Responses:   AuthCreatedResponses("Supplier offer created", coreclient.SupplierOffer{}),
		},
		{
			Method:      http.MethodGet,
			Path:        "/v1/supplier/inventory",
			OperationID: "listSupplierInventory",
			Summary:     "List inventory snapshots",
			Tags:        []string{"Inventory"},
			Auth:        true,
			Parameters:  []ParameterSpec{LimitParam(), OffsetParam()},
			Responses:   ListResponses[coreclient.InventorySnapshot]("Inventory snapshot collection"),
		},
		{
			Method:      http.MethodPost,
			Path:        "/v1/supplier/inventory/snapshots",
			OperationID: "createInventorySnapshot",
			Summary:     "Create an inventory snapshot",
			Tags:        []string{"Inventory"},
			Auth:        true,
			RequestBody: supplierapi.InventorySnapshotCreateRequest{},
			Responses:   AuthCreatedResponses("Inventory snapshot created", coreclient.InventorySnapshot{}),
		},
		{
			Method:      http.MethodPost,
			Path:        "/v1/supplier/inventory/{snapshot_id}/adjustments",
			OperationID: "adjustInventorySnapshot",
			Summary:     "Adjust an inventory snapshot",
			Tags:        []string{"Inventory", "Audit"},
			Auth:        true,
			Parameters:  []ParameterSpec{PathStringParam("snapshot_id", "Inventory snapshot identifier")},
			RequestBody: supplierapi.InventoryAdjustmentRequest{},
			Responses:   AuthOKResponses("Inventory adjusted", supplierapi.InventoryAdjustmentResponse{}),
		},
		{
			Method:      http.MethodGet,
			Path:        "/v1/supplier/inventory/{snapshot_id}/movements",
			OperationID: "listInventoryMovements",
			Summary:     "List inventory movements",
			Tags:        []string{"Inventory", "Audit"},
			Auth:        true,
			Parameters:  []ParameterSpec{PathStringParam("snapshot_id", "Inventory snapshot identifier"), LimitParam(), OffsetParam()},
			Responses:   ListResponses[coreclient.InventoryMovement]("Inventory movement collection"),
		},
	}
}
