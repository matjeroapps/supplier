package httpx

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestHealthzIncludesRequestAndCorrelationHeaders(t *testing.T) {
	router := NewRouter(App{
		Config: Config{
			ServiceName:     "admin-api",
			Environment:     "test",
			Addr:            ":0",
			ShutdownTimeout: time.Second,
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	req.Header.Set(HeaderCorrelationID, "corr-123")
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("status = %d", resp.Code)
	}
	if resp.Header().Get(HeaderRequestID) == "" {
		t.Fatal("missing request id header")
	}
	if got := resp.Header().Get(HeaderCorrelationID); got != "corr-123" {
		t.Fatalf("correlation id = %q", got)
	}
}

func TestReadyzUsesReadinessCheck(t *testing.T) {
	router := NewRouter(App{
		Config: Config{ServiceName: "admin-api"},
		Ready: func(context.Context) error {
			return context.Canceled
		},
	})

	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, httptest.NewRequest(http.MethodGet, "/readyz", nil))

	if resp.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d", resp.Code)
	}
}

func TestCORSPreflightAllowsConfiguredSupplierOriginBeforeAuth(t *testing.T) {
	router := NewRouter(App{
		Config: Config{
			ServiceName:    "supplier-api",
			AllowedOrigins: []string{"http://localhost:5175"},
		},
	})
	router.Get("/v1/bootstrap", func(w http.ResponseWriter, r *http.Request) {
		WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	req := httptest.NewRequest(http.MethodOptions, "/v1/bootstrap?locale=en", nil)
	req.Header.Set("Origin", "http://localhost:5175")
	req.Header.Set("Access-Control-Request-Method", http.MethodGet)
	req.Header.Set("Access-Control-Request-Headers", "authorization")
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusNoContent {
		t.Fatalf("status = %d", resp.Code)
	}
	if got := resp.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5175" {
		t.Fatalf("Access-Control-Allow-Origin = %q", got)
	}
	if got := resp.Header().Get("Access-Control-Allow-Headers"); got == "" {
		t.Fatal("missing Access-Control-Allow-Headers")
	}
}

func TestCORSDoesNotReflectUnconfiguredOrigins(t *testing.T) {
	router := NewRouter(App{
		Config: Config{
			ServiceName:    "supplier-api",
			AllowedOrigins: []string{"http://localhost:5175"},
		},
	})

	req := httptest.NewRequest(http.MethodOptions, "/v1/bootstrap?locale=en", nil)
	req.Header.Set("Origin", "http://evil.test")
	req.Header.Set("Access-Control-Request-Method", http.MethodGet)
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if got := resp.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("unexpected Access-Control-Allow-Origin = %q", got)
	}
}
