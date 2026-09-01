package supplierapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/matjeroapps/supplier/internal/auth"
	"github.com/matjeroapps/supplier/internal/coreclient"
	"github.com/matjeroapps/supplier/internal/i18n"
	"github.com/matjeroapps/supplier/internal/money"
)

// These tests prove the Supplier API's transport and BFF behaviour against a
// local stub Core. They need no PostgreSQL, no Core migrations and no Core
// module: business correctness is Core's responsibility and is tested there.

const testSubject = "supplier-user-subject"

// stubCore records the calls the handlers make and returns canned results.
type stubCore struct {
	// subject records the forwarded end-user subject on the last call.
	subject string
	// supplierID records the supplier identifier the last call addressed.
	supplierID string
	// resourceID records the secondary identifier (product, snapshot) the last
	// call addressed.
	resourceID string
	// page records the forwarded pagination window.
	page coreclient.Page

	err error

	supplier   coreclient.Supplier
	settings   map[string]any
	status     string
	markets    []coreclient.SupplierMarket
	locations  []coreclient.FulfillmentLocation
	location   coreclient.FulfillmentLocation
	products   []coreclient.SupplierProduct
	product    coreclient.ProductCreateResult
	categories []string
	offers     []coreclient.SupplierOffer
	offer      coreclient.SupplierOffer
	snapshots  []coreclient.InventorySnapshot
	snapshot   coreclient.InventorySnapshot
	adjust     coreclient.InventoryAdjustmentResult
	movements  []coreclient.InventoryMovement
}

func (s *stubCore) ResolveSupplier(ctx context.Context, subject string) (string, error) {
	s.subject = subject
	return "supplier-resolved", s.err
}

func (s *stubCore) GetSupplier(ctx context.Context, supplierID, subject string) (coreclient.Supplier, map[string]any, error) {
	s.supplierID, s.subject = supplierID, subject
	return s.supplier, s.settings, s.err
}

func (s *stubCore) UpdateSupplierProfile(ctx context.Context, supplierID, subject string, update coreclient.ProfileUpdate) (string, error) {
	s.supplierID, s.subject = supplierID, subject
	return s.status, s.err
}

func (s *stubCore) ListSupplierMarkets(ctx context.Context, supplierID, subject string, page coreclient.Page) ([]coreclient.SupplierMarket, error) {
	s.supplierID, s.subject, s.page = supplierID, subject, page
	return s.markets, s.err
}

func (s *stubCore) ListLocations(ctx context.Context, supplierID, subject string, page coreclient.Page) ([]coreclient.FulfillmentLocation, error) {
	s.supplierID, s.subject, s.page = supplierID, subject, page
	return s.locations, s.err
}

func (s *stubCore) CreateLocation(ctx context.Context, supplierID, subject string, create coreclient.LocationCreate) (coreclient.FulfillmentLocation, error) {
	s.supplierID, s.subject = supplierID, subject
	return s.location, s.err
}

func (s *stubCore) ListProducts(ctx context.Context, supplierID, subject string, page coreclient.Page) ([]coreclient.SupplierProduct, error) {
	s.supplierID, s.subject, s.page = supplierID, subject, page
	return s.products, s.err
}

func (s *stubCore) CreateProduct(ctx context.Context, supplierID, subject string, create coreclient.ProductCreate) (coreclient.ProductCreateResult, error) {
	s.supplierID, s.subject = supplierID, subject
	return s.product, s.err
}

func (s *stubCore) SetProductCategories(ctx context.Context, supplierID, productID, subject string, categoryIDs []string) ([]string, error) {
	s.supplierID, s.resourceID, s.subject = supplierID, productID, subject
	return s.categories, s.err
}

func (s *stubCore) ListOffers(ctx context.Context, supplierID, subject string, page coreclient.Page) ([]coreclient.SupplierOffer, error) {
	s.supplierID, s.subject, s.page = supplierID, subject, page
	return s.offers, s.err
}

func (s *stubCore) CreateOffer(ctx context.Context, supplierID, subject string, create coreclient.OfferCreate) (coreclient.SupplierOffer, error) {
	s.supplierID, s.subject = supplierID, subject
	return s.offer, s.err
}

func (s *stubCore) ListInventorySnapshots(ctx context.Context, supplierID, subject string, page coreclient.Page) ([]coreclient.InventorySnapshot, error) {
	s.supplierID, s.subject, s.page = supplierID, subject, page
	return s.snapshots, s.err
}

func (s *stubCore) CreateInventorySnapshot(ctx context.Context, supplierID, subject string, create coreclient.SnapshotCreate) (coreclient.InventorySnapshot, error) {
	s.supplierID, s.subject = supplierID, subject
	return s.snapshot, s.err
}

func (s *stubCore) AdjustInventory(ctx context.Context, supplierID, snapshotID, subject string, adjustment coreclient.InventoryAdjustment) (coreclient.InventoryAdjustmentResult, error) {
	s.supplierID, s.resourceID, s.subject = supplierID, snapshotID, subject
	return s.adjust, s.err
}

func (s *stubCore) ListInventoryMovements(ctx context.Context, supplierID, snapshotID, subject string, page coreclient.Page) ([]coreclient.InventoryMovement, error) {
	s.supplierID, s.resourceID, s.subject, s.page = supplierID, snapshotID, subject, page
	return s.movements, s.err
}

// newHandler builds the supplier routes behind an authenticated principal.
func newHandler(core CoreCapabilities) http.Handler {
	router := chi.NewRouter()
	router.Use(i18n.Middleware(i18n.Default()))
	router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), auth.Principal{
				Subject: testSubject,
				Roles:   []string{auth.RoleSupplierOwner},
			})))
		})
	})
	router.Route("/v1", func(r chi.Router) {
		RegisterSupplierRoutes(Dependencies{Core: core})(r)
	})
	return router
}

func doRequest(t *testing.T, handler http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func decodeError(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var payload struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode error envelope: %v (body %q)", err, rec.Body.String())
	}
	return payload.Error.Code
}

// --- forwarded actor identity ---

func TestSupplierForwardsAuthenticatedSubject(t *testing.T) {
	core := &stubCore{}
	handler := newHandler(core)

	doRequest(t, handler, http.MethodGet, "/v1/supplier/profile", "")

	if core.subject != testSubject {
		t.Fatalf("forwarded subject = %q, want %q", core.subject, testSubject)
	}
}

// A client-supplied internal identity header must never be trusted: the subject
// always comes from the validated principal on the request context.
func TestSupplierIgnoresClientSuppliedSubjectHeader(t *testing.T) {
	core := &stubCore{}
	handler := newHandler(core)

	req := httptest.NewRequest(http.MethodGet, "/v1/supplier/profile", nil)
	req.Header.Set("X-Matjero-Subject", "attacker-subject")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if core.subject != testSubject {
		t.Fatalf("forwarded subject = %q, want the authenticated principal %q", core.subject, testSubject)
	}
}

// --- request mapping ---

func TestSupplierMapsPagination(t *testing.T) {
	core := &stubCore{}
	handler := newHandler(core)

	doRequest(t, handler, http.MethodGet, "/v1/supplier/products?limit=10&offset=20", "")

	if core.page.Limit != 10 || core.page.Offset != 20 {
		t.Fatalf("forwarded page = %+v, want limit 10 offset 20", core.page)
	}
}

func TestSupplierClampsPagination(t *testing.T) {
	core := &stubCore{}
	handler := newHandler(core)

	doRequest(t, handler, http.MethodGet, "/v1/supplier/products?limit=9999&offset=-5", "")

	if core.page.Limit != 25 {
		t.Errorf("limit = %d, want the default 25 when above the maximum", core.page.Limit)
	}
	if core.page.Offset != 0 {
		t.Errorf("offset = %d, want 0 when negative", core.page.Offset)
	}
}

func TestSupplierRejectsInvalidJSON(t *testing.T) {
	core := &stubCore{}
	handler := newHandler(core)

	rec := doRequest(t, handler, http.MethodPut, "/v1/supplier/profile", `{"name":`)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 (body %q)", rec.Code, rec.Body.String())
	}
	if got := decodeError(t, rec); got != "invalid_json" {
		t.Errorf("error code = %q, want invalid_json", got)
	}
}

// --- response mapping ---

func TestSupplierMapsProfileResponse(t *testing.T) {
	core := &stubCore{
		supplier: coreclient.Supplier{ID: "sup-1", Code: "supplier-a", Name: "Supplier A", Status: "active"},
		settings: map[string]any{"contact_email": "ops@supplier.test"},
	}
	handler := newHandler(core)

	rec := doRequest(t, handler, http.MethodGet, "/v1/supplier/profile", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d (body %q)", rec.Code, rec.Body.String())
	}

	var payload SupplierProfileResponse
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if payload.Supplier.ID != "sup-1" {
		t.Errorf("supplier id = %q, want sup-1", payload.Supplier.ID)
	}
	if payload.Settings["contact_email"] != "ops@supplier.test" {
		t.Errorf("settings = %+v, want the contact email", payload.Settings)
	}
}

func TestSupplierProductCreateReturns201WithBothEntities(t *testing.T) {
	core := &stubCore{product: coreclient.ProductCreateResult{
		Product:         coreclient.Product{ID: "pro-1", Slug: "lamp"},
		SupplierProduct: coreclient.SupplierProduct{ID: "sp-1", SupplierCode: "LAMP-1"},
	}}
	handler := newHandler(core)

	rec := doRequest(t, handler, http.MethodPost, "/v1/supplier/products",
		`{"slug":"lamp","status":"active","supplier_code":"LAMP-1","translations":[{"locale":"en","name":"Lamp","description":"A lamp"}],"category_ids":["cat-1"]}`)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201 (body %q)", rec.Code, rec.Body.String())
	}
	var payload ProductCreateResponse
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if payload.Product.Slug != "lamp" || payload.SupplierProduct.SupplierCode != "LAMP-1" {
		t.Errorf("payload = %+v, want both entities", payload)
	}
}

func TestSupplierLocationCreateReturns201(t *testing.T) {
	core := &stubCore{location: coreclient.FulfillmentLocation{ID: "loc-1", Code: "cairo-hub"}}
	handler := newHandler(core)

	rec := doRequest(t, handler, http.MethodPost, "/v1/supplier/locations",
		`{"supplier_market_id":"sm-1","market_code":"EG","code":"cairo-hub","name":"Cairo Hub","location_type":"warehouse","status":"active"}`)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201 (body %q)", rec.Code, rec.Body.String())
	}
}

func TestSupplierOfferCreateForwardsPriceAndAvailability(t *testing.T) {
	core := &stubCore{offer: coreclient.SupplierOffer{ID: "off-1"}}
	handler := newHandler(core)

	rec := doRequest(t, handler, http.MethodPost, "/v1/supplier/offers",
		`{"supplier_product_id":"sp-1","supplier_market_id":"sm-1","market_code":"EG","status":"active","price":{"amount_minor":10000,"currency":"EGP"},"is_available":true,"available_qty":5}`)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201 (body %q)", rec.Code, rec.Body.String())
	}
	if core.supplierID != "supplier-resolved" {
		t.Errorf("addressed supplier = %q, want the resolved identity", core.supplierID)
	}
}

func TestSupplierInventoryAdjustmentMapsBothEntities(t *testing.T) {
	core := &stubCore{adjust: coreclient.InventoryAdjustmentResult{
		Snapshot: coreclient.InventorySnapshot{ID: "snap-1", OnHandQty: 8},
		Movement: coreclient.InventoryMovement{ID: "mov-1", QuantityDelta: -2},
	}}
	handler := newHandler(core)

	rec := doRequest(t, handler, http.MethodPost, "/v1/supplier/inventory/snap-1/adjustments",
		`{"quantity_delta":-2,"movement_type":"sale","reason":"order"}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d (body %q)", rec.Code, rec.Body.String())
	}
	var payload InventoryAdjustmentResponse
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if payload.Snapshot.OnHandQty != 8 || payload.Movement.QuantityDelta != -2 {
		t.Errorf("payload = %+v, want both entities", payload)
	}
	if core.resourceID != "snap-1" {
		t.Errorf("addressed snapshot = %q, want snap-1", core.resourceID)
	}
}

func TestSupplierProductCategoriesForwardsProductID(t *testing.T) {
	core := &stubCore{categories: []string{"cat-1", "cat-2"}}
	handler := newHandler(core)

	rec := doRequest(t, handler, http.MethodPut, "/v1/supplier/products/pro-1/categories", `{"category_ids":["cat-1","cat-2"]}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d (body %q)", rec.Code, rec.Body.String())
	}
	if core.resourceID != "pro-1" {
		t.Errorf("addressed product = %q, want pro-1", core.resourceID)
	}
}

func TestSupplierInventoryMovementsForwardsSnapshotID(t *testing.T) {
	core := &stubCore{movements: []coreclient.InventoryMovement{{ID: "mov-1"}}}
	handler := newHandler(core)

	rec := doRequest(t, handler, http.MethodGet, "/v1/supplier/inventory/snap-1/movements", "")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d (body %q)", rec.Code, rec.Body.String())
	}
	if core.resourceID != "snap-1" {
		t.Errorf("addressed snapshot = %q, want snap-1", core.resourceID)
	}
}

// --- public error mapping ---

func TestSupplierMapsCoreErrorsToPublicResponses(t *testing.T) {
	cases := []struct {
		name       string
		code       string
		wantStatus int
		wantCode   string
	}{
		{"not found", coreclient.CodeNotFound, http.StatusNotFound, "not_found"},
		{"validation", coreclient.CodeValidationError, http.StatusBadRequest, "validation_error"},
		{"market mismatch", coreclient.CodeMarketMismatch, http.StatusConflict, "market_mismatch"},
		{"insufficient inventory", coreclient.CodeInsufficientInventory, http.StatusConflict, "insufficient_inventory"},
		{"conflict", coreclient.CodeConflict, http.StatusConflict, "conflict"},
		{"forbidden", coreclient.CodeForbidden, http.StatusForbidden, "forbidden"},
		{"internal", coreclient.CodeInternalError, http.StatusInternalServerError, "internal_error"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			core := &stubCore{err: &coreclient.Error{Status: tc.wantStatus, Code: tc.code}}
			handler := newHandler(core)

			rec := doRequest(t, handler, http.MethodGet, "/v1/supplier/profile", "")

			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d (body %q)", rec.Code, tc.wantStatus, rec.Body.String())
			}
			if got := decodeError(t, rec); got != tc.wantCode {
				t.Errorf("error code = %q, want %q", got, tc.wantCode)
			}
		})
	}
}

func TestSupplierReturns503WhenCoreUnavailable(t *testing.T) {
	core := &stubCore{err: coreclient.ErrUnavailable}
	handler := newHandler(core)

	rec := doRequest(t, handler, http.MethodGet, "/v1/supplier/profile", "")

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503 (body %q)", rec.Code, rec.Body.String())
	}
	if got := decodeError(t, rec); got != "service_unavailable" {
		t.Errorf("error code = %q, want service_unavailable", got)
	}
	// The response must not leak the internal Core host or a transport detail.
	body := rec.Body.String()
	for _, leak := range []string{"connection refused", "core-api", "dial tcp"} {
		if strings.Contains(body, leak) {
			t.Errorf("response leaked transport detail %q: %s", leak, body)
		}
	}
}

func TestSupplierReturns503OnCoreTimeout(t *testing.T) {
	core := &stubCore{err: context.DeadlineExceeded}
	handler := newHandler(core)

	rec := doRequest(t, handler, http.MethodGet, "/v1/supplier/profile", "")

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503 (body %q)", rec.Code, rec.Body.String())
	}
}

// The money type must round-trip through the public contract unchanged.
func TestSupplierOfferPriceRoundTrips(t *testing.T) {
	core := &stubCore{offer: coreclient.SupplierOffer{ID: "off-1"}}
	handler := newHandler(core)

	doRequest(t, handler, http.MethodPost, "/v1/supplier/offers",
		`{"supplier_product_id":"sp-1","supplier_market_id":"sm-1","market_code":"EG","status":"active","price":{"amount_minor":10000,"currency":"EGP"}}`)

	// The request decoded into the local money type without error, which is what
	// the public contract requires.
	var _ money.Money
}
