package openapi

import (
	"net/http"

	"github.com/getkin/kin-openapi/openapi3"

	"github.com/matjeroapps/core/pkg/commerce"
	"github.com/matjeroapps/core/pkg/contracts"
	"github.com/matjeroapps/supplier/internal/supplierapi"
)

func BuildSupplierSpec() (*openapi3.T, error) {
	return BuildDocument(DocumentSpec{
		Title:         "Matjero Supplier API",
		Description:   "OpenAPI contract for the Matjero Supplier API.",
		Authenticated: true,
		Tags:          openAPITags(),
		Routes:        append(actorRoutes(true), supplierRoutes()...),
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
			Responses:   authReadResponses("Supplier profile", supplierapi.SupplierProfileResponse{}),
		},
		{
			Method:      http.MethodPut,
			Path:        "/v1/supplier/profile",
			OperationID: "updateSupplierProfile",
			Summary:     "Update the supplier profile",
			Tags:        []string{"Suppliers"},
			Auth:        true,
			RequestBody: supplierapi.SupplierProfileUpdateRequest{},
			Responses:   authOKResponses("Supplier profile updated", contracts.StatusResponse{}),
		},
		{
			Method:      http.MethodGet,
			Path:        "/v1/supplier/markets",
			OperationID: "listSupplierMarkets",
			Summary:     "List supplier markets",
			Tags:        []string{"Markets"},
			Auth:        true,
			Parameters:  []ParameterSpec{limitParam(), offsetParam()},
			Responses:   listResponses[commerce.SupplierMarket]("Supplier market collection"),
		},
		{
			Method:      http.MethodGet,
			Path:        "/v1/supplier/locations",
			OperationID: "listSupplierLocations",
			Summary:     "List fulfillment locations",
			Tags:        []string{"Fulfillment Locations"},
			Auth:        true,
			Parameters:  []ParameterSpec{limitParam(), offsetParam()},
			Responses:   listResponses[commerce.FulfillmentLocation]("Fulfillment location collection"),
		},
		{
			Method:      http.MethodPost,
			Path:        "/v1/supplier/locations",
			OperationID: "createSupplierLocation",
			Summary:     "Create a fulfillment location",
			Tags:        []string{"Fulfillment Locations"},
			Auth:        true,
			RequestBody: supplierapi.SupplierLocationCreateRequest{},
			Responses:   authCreatedResponses("Fulfillment location created", commerce.FulfillmentLocation{}),
		},
		{
			Method:      http.MethodGet,
			Path:        "/v1/supplier/products",
			OperationID: "listSupplierProducts",
			Summary:     "List supplier products",
			Tags:        []string{"Catalog"},
			Auth:        true,
			Parameters:  []ParameterSpec{limitParam(), offsetParam()},
			Responses:   listResponses[commerce.SupplierProduct]("Supplier product collection"),
		},
		{
			Method:      http.MethodPost,
			Path:        "/v1/supplier/products",
			OperationID: "createSupplierProduct",
			Summary:     "Create a supplier product",
			Tags:        []string{"Catalog", "Categories", "Attributes", "Variants", "SKUs"},
			Auth:        true,
			RequestBody: supplierapi.SupplierProductCreateRequest{},
			Responses:   authCreatedResponses("Supplier product created", supplierapi.ProductCreateResponse{}),
		},
		{
			Method:      http.MethodPut,
			Path:        "/v1/supplier/products/{id}/categories",
			OperationID: "setSupplierProductCategories",
			Summary:     "Update supplier product categories",
			Tags:        []string{"Categories"},
			Auth:        true,
			Parameters:  []ParameterSpec{pathStringParam("id", "Product identifier")},
			RequestBody: supplierapi.SupplierProductCategoriesRequest{},
			Responses:   authOKResponses("Supplier product categories updated", supplierapi.SupplierProductCategoriesRequest{}),
		},
		{
			Method:      http.MethodGet,
			Path:        "/v1/supplier/offers",
			OperationID: "listSupplierOffers",
			Summary:     "List supplier offers",
			Tags:        []string{"Supplier Offers"},
			Auth:        true,
			Parameters:  []ParameterSpec{limitParam(), offsetParam()},
			Responses:   listResponses[commerce.SupplierOffer]("Supplier offer collection"),
		},
		{
			Method:      http.MethodPost,
			Path:        "/v1/supplier/offers",
			OperationID: "createSupplierOffer",
			Summary:     "Create a supplier offer",
			Tags:        []string{"Supplier Offers"},
			Auth:        true,
			RequestBody: supplierapi.SupplierOfferCreateRequest{},
			Responses:   authCreatedResponses("Supplier offer created", commerce.SupplierOffer{}),
		},
		{
			Method:      http.MethodGet,
			Path:        "/v1/supplier/inventory",
			OperationID: "listSupplierInventory",
			Summary:     "List inventory snapshots",
			Tags:        []string{"Inventory"},
			Auth:        true,
			Parameters:  []ParameterSpec{limitParam(), offsetParam()},
			Responses:   listResponses[commerce.InventorySnapshot]("Inventory snapshot collection"),
		},
		{
			Method:      http.MethodPost,
			Path:        "/v1/supplier/inventory/snapshots",
			OperationID: "createInventorySnapshot",
			Summary:     "Create an inventory snapshot",
			Tags:        []string{"Inventory"},
			Auth:        true,
			RequestBody: supplierapi.InventorySnapshotCreateRequest{},
			Responses:   authCreatedResponses("Inventory snapshot created", commerce.InventorySnapshot{}),
		},
		{
			Method:      http.MethodPost,
			Path:        "/v1/supplier/inventory/{snapshot_id}/adjustments",
			OperationID: "adjustInventorySnapshot",
			Summary:     "Adjust an inventory snapshot",
			Tags:        []string{"Inventory", "Audit"},
			Auth:        true,
			Parameters:  []ParameterSpec{pathStringParam("snapshot_id", "Inventory snapshot identifier")},
			RequestBody: supplierapi.InventoryAdjustmentRequest{},
			Responses:   authOKResponses("Inventory adjusted", supplierapi.InventoryAdjustmentResponse{}),
		},
		{
			Method:      http.MethodGet,
			Path:        "/v1/supplier/inventory/{snapshot_id}/movements",
			OperationID: "listInventoryMovements",
			Summary:     "List inventory movements",
			Tags:        []string{"Inventory", "Audit"},
			Auth:        true,
			Parameters:  []ParameterSpec{pathStringParam("snapshot_id", "Inventory snapshot identifier"), limitParam(), offsetParam()},
			Responses:   listResponses[commerce.InventoryMovement]("Inventory movement collection"),
		},
	}
}
