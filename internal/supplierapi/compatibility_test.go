package supplierapi

// Compatibility decision tests (Feature 025). They prove the
// server-authoritative decision boundary: allowlisted routes only, verified
// membership + capability only, rollback flag default-off, and no acceptance
// of arbitrary external destinations.

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
)

type fakeBootstrapResolver struct {
	bootstrap *coreclient.MerchantCompatibilityBootstrap
	err       error
}

func (f *fakeBootstrapResolver) GetMerchantBootstrap(ctx context.Context, subject string) (*coreclient.MerchantCompatibilityBootstrap, error) {
	return f.bootstrap, f.err
}

func operableWorkspace(overrides func(*coreclient.MerchantCompatibilityWorkspace)) coreclient.MerchantCompatibilityWorkspace {
	ws := coreclient.MerchantCompatibilityWorkspace{
		MerchantID:     "11111111-1111-1111-1111-111111111111",
		MerchantCode:   "M1",
		LegalName:      "Merchant One",
		MerchantStatus: "active",
	}
	ws.Membership.Status = "active"
	ws.Capabilities = &struct {
		Retail *struct {
			Status string `json:"status"`
		} `json:"retail"`
		Supply *struct {
			Status string `json:"status"`
		} `json:"supply"`
	}{Supply: &struct {
		Status string `json:"status"`
	}{Status: "active"}}
	if overrides != nil {
		overrides(&ws)
	}
	return ws
}

func newCompatibilityHandler(t *testing.T, resolver BootstrapResolver, config CompatibilityConfig) http.Handler {
	t.Helper()
	deps := Dependencies{
		Core:          &stubCore{},
		Compatibility: NewConsoleCompatibilityService(resolver, config, nil),
	}
	router := chi.NewRouter()
	router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), auth.Principal{
				Subject: testCompatibilitySubject,
				Roles:   []string{"supplier_owner"},
			})))
		})
	})
	router.Route("/v1", func(r chi.Router) {
		RegisterCompatibilityRoutes(deps)(r)
	})
	return router
}

const testCompatibilitySubject = "compat-subject-1"

func postDecision(t *testing.T, handler http.Handler, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/v1/supplier/console-compatibility", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func decodeDecision(t *testing.T, rec *httptest.ResponseRecorder) consoleCompatibilityResponse {
	t.Helper()
	var out consoleCompatibilityResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode decision: %v (body %q)", err, rec.Body.String())
	}
	return out
}

func TestCompatibilityRedirectsDisabledByDefault(t *testing.T) {
	handler := newCompatibilityHandler(t, &fakeBootstrapResolver{
		bootstrap: &coreclient.MerchantCompatibilityBootstrap{
			Workspaces: []coreclient.MerchantCompatibilityWorkspace{operableWorkspace(nil)},
		},
	}, CompatibilityConfig{})

	rec := postDecision(t, handler, `{"intent_path":"/integrations"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	decision := decodeDecision(t, rec)
	if decision.Decision != "stay" || decision.Reason != "redirects_disabled" {
		t.Fatalf("expected stay/redirects_disabled, got %+v", decision)
	}
	if decision.Destination != nil {
		t.Errorf("no destination may be offered while disabled: %+v", decision)
	}
}

func TestCompatibilityVerifiedRouteRedirectWithIntent(t *testing.T) {
	handler := newCompatibilityHandler(t, &fakeBootstrapResolver{
		bootstrap: &coreclient.MerchantCompatibilityBootstrap{
			Workspaces: []coreclient.MerchantCompatibilityWorkspace{operableWorkspace(nil)},
		},
	}, CompatibilityConfig{RedirectsEnabled: true})

	rec := postDecision(t, handler, `{"intent_path":"/integrations"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	decision := decodeDecision(t, rec)
	if decision.Decision != "redirect" || decision.Destination == nil {
		t.Fatalf("expected redirect, got %+v", decision)
	}
	if decision.Destination.Path != "/dashboard/merchants/11111111-1111-1111-1111-111111111111/supply/connections?legacy=supplier" {
		t.Errorf("unexpected destination: %s", decision.Destination.Path)
	}
	if decision.Destination.MerchantID == "" {
		t.Errorf("destination must carry the validated merchant id")
	}
}

func TestCompatibilityUnverifiedRoutesRemainLegacy(t *testing.T) {
	handler := newCompatibilityHandler(t, &fakeBootstrapResolver{
		bootstrap: &coreclient.MerchantCompatibilityBootstrap{
			Workspaces: []coreclient.MerchantCompatibilityWorkspace{operableWorkspace(nil)},
		},
	}, CompatibilityConfig{RedirectsEnabled: true})

	for _, intent := range []string{"/products", "/offers", "/inventory", "/locations", "/retail", "/settings", "/dashboard", "/unknown"} {
		rec := postDecision(t, handler, `{"intent_path":"`+intent+`"}`)
		decision := decodeDecision(t, rec)
		if decision.Decision != "stay" || decision.Reason != "no_verified_equivalent" {
			t.Errorf("%s: expected stay/no_verified_equivalent, got %+v", intent, decision)
		}
	}
}

func TestCompatibilityEligibilityShapesStayLegacy(t *testing.T) {
	enabled := CompatibilityConfig{RedirectsEnabled: true}

	cases := []struct {
		name       string
		resolver   *fakeBootstrapResolver
		wantStay   bool
		wantReason string
	}{
		{
			name:       "no membership",
			resolver:   &fakeBootstrapResolver{bootstrap: &coreclient.MerchantCompatibilityBootstrap{}},
			wantReason: "no_active_eligible_membership",
		},
		{
			name: "suspended membership",
			resolver: &fakeBootstrapResolver{bootstrap: &coreclient.MerchantCompatibilityBootstrap{
				Workspaces: []coreclient.MerchantCompatibilityWorkspace{operableWorkspace(func(ws *coreclient.MerchantCompatibilityWorkspace) {
					ws.Membership.Status = "suspended"
				})},
			}},
			wantReason: "no_active_eligible_membership",
		},
		{
			name: "suspended supply capability",
			resolver: &fakeBootstrapResolver{bootstrap: &coreclient.MerchantCompatibilityBootstrap{
				Workspaces: []coreclient.MerchantCompatibilityWorkspace{operableWorkspace(func(ws *coreclient.MerchantCompatibilityWorkspace) {
					ws.Capabilities.Supply.Status = "suspended"
				})},
			}},
			wantReason: "no_active_eligible_membership",
		},
		{
			name: "suspended merchant",
			resolver: &fakeBootstrapResolver{bootstrap: &coreclient.MerchantCompatibilityBootstrap{
				Workspaces: []coreclient.MerchantCompatibilityWorkspace{operableWorkspace(func(ws *coreclient.MerchantCompatibilityWorkspace) {
					ws.MerchantStatus = "suspended"
				})},
			}},
			wantReason: "no_active_eligible_membership",
		},
		{
			name:       "core unreachable",
			resolver:   &fakeBootstrapResolver{err: context.DeadlineExceeded},
			wantReason: "eligibility_unresolved",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			handler := newCompatibilityHandler(t, tc.resolver, enabled)
			rec := postDecision(t, handler, `{"intent_path":"/integrations"}`)
			decision := decodeDecision(t, rec)
			if decision.Decision != "stay" || decision.Reason != tc.wantReason {
				t.Fatalf("expected stay/%s, got %+v", tc.wantReason, decision)
			}
			if decision.Destination != nil {
				t.Errorf("stay decisions must not carry a destination: %+v", decision)
			}
		})
	}
}

func TestCompatibilityRejectsArbitraryExternalDestinations(t *testing.T) {
	handler := newCompatibilityHandler(t, &fakeBootstrapResolver{
		bootstrap: &coreclient.MerchantCompatibilityBootstrap{
			Workspaces: []coreclient.MerchantCompatibilityWorkspace{operableWorkspace(nil)},
		},
	}, CompatibilityConfig{RedirectsEnabled: true})

	for _, body := range []string{
		`{"intent_path":"https://evil.example/grab"}`,
		`{"intent_path":"//evil.example"}`,
		`{"intent_path":"/integrations?next=//evil.example"}`,
		`{"intent_path":"/dashboard/../../integrations"}`,
		`{}`,
	} {
		rec := postDecision(t, handler, body)
		if rec.Code == http.StatusOK {
			decision := decodeDecision(t, rec)
			if decision.Decision == "redirect" {
				t.Errorf("%s: a redirect must never be produced from this intent", body)
			}
		}
	}
}

func TestCompatibilityRollbackFlagRestoresLegacyImmediately(t *testing.T) {
	resolver := &fakeBootstrapResolver{
		bootstrap: &coreclient.MerchantCompatibilityBootstrap{
			Workspaces: []coreclient.MerchantCompatibilityWorkspace{operableWorkspace(nil)},
		},
	}
	deps := Dependencies{
		Core:          &stubCore{},
		Compatibility: NewConsoleCompatibilityService(resolver, CompatibilityConfig{RedirectsEnabled: true}, nil),
	}
	router := chi.NewRouter()
	router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), auth.Principal{
				Subject: testCompatibilitySubject,
				Roles:   []string{"supplier_owner"},
			})))
		})
	})
	router.Route("/v1", func(r chi.Router) {
		RegisterCompatibilityRoutes(deps)(r)
	})

	rec := postDecision(t, router, `{"intent_path":"/integrations"}`)
	if got := decodeDecision(t, rec); got.Decision != "redirect" {
		t.Fatalf("expected redirect while enabled, got %+v", got)
	}

	// Runtime rollback: no rebuild, no redeploy.
	deps.Compatibility.SetRedirectsEnabled(false)
	rec = postDecision(t, router, `{"intent_path":"/integrations"}`)
	if got := decodeDecision(t, rec); got.Decision != "stay" || got.Reason != "redirects_disabled" {
		t.Fatalf("rollback must restore legacy immediately, got %+v", got)
	}
}

func TestCompatibilityDecisionIsAvailableWithoutSupplierProfileResolution(t *testing.T) {
	// The decision endpoint resolves membership from the verified subject via
	// Core bootstrap; it must not depend on legacy supplier profile resolution.
	handler := newCompatibilityHandler(t, &fakeBootstrapResolver{
		bootstrap: &coreclient.MerchantCompatibilityBootstrap{
			Workspaces: []coreclient.MerchantCompatibilityWorkspace{operableWorkspace(nil)},
		},
	}, CompatibilityConfig{RedirectsEnabled: true})
	rec := postDecision(t, handler, `{"intent_path":"/integrations"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
}
