package main

// Regression coverage for the Feature 025 supplier router startup defect: the
// usage measurement middleware was applied to the actor router after its
// routes had already been registered, which panics chi mux construction and
// took the Supplier API down at startup. These tests construct the production
// wiring (actorapi.NewRouter plus mountSupplierRoutes) and prove it builds,
// serves, and scopes correctly.

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/matjeroapps/supplier/internal/actorapi"
	"github.com/matjeroapps/supplier/internal/auth"
	"github.com/matjeroapps/supplier/internal/coreclient"
	"github.com/matjeroapps/supplier/internal/i18n"
	"github.com/matjeroapps/supplier/internal/markets"
	"github.com/matjeroapps/supplier/internal/supplierapi"
)

// captureLogger returns a logger that collects every rendered record so the
// tests can assert which requests the usage measurement middleware observed.
func captureLogger(buf *bytes.Buffer) *slog.Logger {
	return slog.New(slog.NewTextHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

// fakeCore satisfies supplierapi.CoreCapabilities; only the methods these
// tests exercise need bodies.
type fakeCore struct {
	supplierapi.CoreCapabilities
}

func (f *fakeCore) ResolveSupplier(ctx context.Context, subject string) (string, error) {
	return "supplier-1", nil
}

func (f *fakeCore) GetSupplier(ctx context.Context, supplierID, subject string) (coreclient.Supplier, map[string]any, error) {
	return coreclient.Supplier{}, nil, nil
}

type fakeMarkets struct{}

func (fakeMarkets) ListMarkets(ctx context.Context, locale i18n.Locale) ([]markets.Market, error) {
	return nil, nil
}

func (fakeMarkets) GetMarket(ctx context.Context, code string, locale i18n.Locale) (markets.Market, error) {
	return markets.Market{}, &coreclient.Error{Status: http.StatusNotFound, Code: coreclient.CodeNotFound}
}

type fakeVerifier struct{ principal auth.Principal }

func (f fakeVerifier) Verify(ctx context.Context, token string) (auth.Principal, error) {
	return f.principal, nil
}

type fakeBootstrapResolver struct{}

func (fakeBootstrapResolver) GetMerchantBootstrap(ctx context.Context, subject string) (*coreclient.MerchantCompatibilityBootstrap, error) {
	return &coreclient.MerchantCompatibilityBootstrap{}, nil
}

// newSupplierActorRouter builds the production router wiring: the actor router
// main.go mounts, with the Feature 025 supplier and compatibility routes
// registered through mountSupplierRoutes and the compatibility rollback flag
// at its zero value — the production default.
func newSupplierActorRouter(logger *slog.Logger) chi.Router {
	deps := supplierapi.Dependencies{Core: &fakeCore{}}
	deps.Compatibility = supplierapi.NewConsoleCompatibilityService(fakeBootstrapResolver{}, supplierapi.CompatibilityConfig{}, logger)
	return actorapi.NewRouter(actorapi.Config{
		AppName:      "Supplier API",
		Actor:        "supplier",
		RequireAuth:  true,
		AllowedRoles: []string{auth.RoleSupplierOwner, auth.RoleSupplierManager, auth.RoleSupplierStaff},
		Register:     mountSupplierRoutes(deps, logger),
	}, fakeMarkets{}, fakeVerifier{principal: auth.Principal{
		Subject: "subject-1",
		Roles:   []string{auth.RoleSupplierOwner},
	}})
}

func authedRequest(method, target string, body io.Reader) *http.Request {
	req := httptest.NewRequest(method, target, body)
	req.Header.Set("Authorization", "Bearer test-token")
	return req
}

// TestSupplierRouterConstructsWithoutPanic pins the startup defect: the real
// actor router with the production Feature 025 registration path must build
// without panicking. Before the sub-router correction this construction died
// with "chi: all middlewares must be defined before routes on a mux".
func TestSupplierRouterConstructsWithoutPanic(t *testing.T) {
	defer func() {
		if rec := recover(); rec != nil {
			t.Fatalf("supplier router construction panicked: %v", rec)
		}
	}()
	if router := newSupplierActorRouter(captureLogger(&bytes.Buffer{})); router == nil {
		t.Fatal("router construction returned nil")
	}
}

// TestLegacyMiddlewareOrderingPanics documents the root cause the child-router
// mounting works around: chi rejects middlewares applied to a mux after that
// mux already serves routes.
func TestLegacyMiddlewareOrderingPanics(t *testing.T) {
	deps := supplierapi.Dependencies{Core: &fakeCore{}}
	deps.Compatibility = supplierapi.NewConsoleCompatibilityService(fakeBootstrapResolver{}, supplierapi.CompatibilityConfig{}, nil)
	logger := captureLogger(&bytes.Buffer{})

	defer func() {
		if rec := recover(); rec == nil {
			t.Fatal("expected middleware-after-routes wiring to panic")
		}
	}()
	actorapi.NewRouter(actorapi.Config{
		AppName:      "Supplier API",
		Actor:        "supplier",
		RequireAuth:  true,
		AllowedRoles: []string{auth.RoleSupplierOwner},
		Register: func(r chi.Router) {
			r.Use(supplierapi.UsageMeasurementMiddleware(logger))
			supplierapi.RegisterSupplierRoutes(deps)(r)
			supplierapi.RegisterCompatibilityRoutes(deps)(r)
		},
	}, fakeMarkets{}, fakeVerifier{principal: auth.Principal{Subject: "subject-1", Roles: []string{auth.RoleSupplierOwner}}})
}

// TestSupplierRouterServesActorAndFeatureRoutes proves the actor routes and
// the Feature 025 supplier/compatibility routes stay mounted at their existing
// URLs through the production wiring, and that the compatibility rollback flag
// still defaults to disabled.
func TestSupplierRouterServesActorAndFeatureRoutes(t *testing.T) {
	router := newSupplierActorRouter(captureLogger(&bytes.Buffer{}))

	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, authedRequest(http.MethodGet, "/v1/bootstrap", nil))
	if resp.Code != http.StatusOK {
		t.Fatalf("GET /v1/bootstrap status = %d, body %q", resp.Code, resp.Body.String())
	}
	var bootstrap struct {
		App string `json:"app"`
	}
	if err := json.Unmarshal(resp.Body.Bytes(), &bootstrap); err != nil {
		t.Fatalf("decode bootstrap: %v", err)
	}
	if bootstrap.App != "Supplier API" {
		t.Fatalf("bootstrap app = %q", bootstrap.App)
	}

	resp = httptest.NewRecorder()
	router.ServeHTTP(resp, authedRequest(http.MethodGet, "/v1/supplier/profile", nil))
	if resp.Code != http.StatusOK {
		t.Fatalf("GET /v1/supplier/profile status = %d, body %q", resp.Code, resp.Body.String())
	}

	resp = httptest.NewRecorder()
	router.ServeHTTP(resp, authedRequest(http.MethodPost, "/v1/supplier/console-compatibility", strings.NewReader(`{"intent_path":"/integrations"}`)))
	if resp.Code != http.StatusOK {
		t.Fatalf("POST /v1/supplier/console-compatibility status = %d, body %q", resp.Code, resp.Body.String())
	}
	var decision struct {
		Decision    string `json:"decision"`
		Reason      string `json:"reason"`
		Destination any    `json:"destination"`
	}
	if err := json.Unmarshal(resp.Body.Bytes(), &decision); err != nil {
		t.Fatalf("decode decision: %v", err)
	}
	if decision.Decision != "stay" || decision.Reason != "redirects_disabled" || decision.Destination != nil {
		t.Fatalf("redirects must default to disabled, got %+v", decision)
	}
}

// TestUsageMeasurementScopedToSupplierRoutes proves the measurement middleware
// observes the Feature 025 supplier routes only — actor routes keep their
// original behavior — and that sensitive query values are never logged.
func TestUsageMeasurementScopedToSupplierRoutes(t *testing.T) {
	var logs bytes.Buffer
	router := newSupplierActorRouter(captureLogger(&logs))

	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, authedRequest(http.MethodGet, "/v1/supplier/profile?access_token=secret-query-value", nil))
	if resp.Code != http.StatusOK {
		t.Fatalf("GET /v1/supplier/profile status = %d, body %q", resp.Code, resp.Body.String())
	}
	rendered := logs.String()
	if !strings.Contains(rendered, "supplier_api usage") || !strings.Contains(rendered, "route=/supplier/profile") {
		t.Fatalf("supplier route usage not measured: %q", rendered)
	}
	if strings.Contains(rendered, "secret-query-value") {
		t.Fatalf("usage measurement logged sensitive query values: %q", rendered)
	}

	// Actor routes registered before the Feature 025 callback must not receive
	// the measurement middleware.
	logs.Reset()
	resp = httptest.NewRecorder()
	router.ServeHTTP(resp, authedRequest(http.MethodGet, "/v1/bootstrap", nil))
	if resp.Code != http.StatusOK {
		t.Fatalf("GET /v1/bootstrap status = %d, body %q", resp.Code, resp.Body.String())
	}
	if strings.Contains(logs.String(), "supplier_api usage") {
		t.Fatalf("actor route must not be measured: %q", logs.String())
	}
}
