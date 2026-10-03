package supplierapi

// Legacy Supplier compatibility (Feature 025). The compatibility decision is
// server-authoritative: the SPA may ask, but never decides. Redirects are
// permitted only for allowlisted legacy routes with verified Merchant Console
// equivalents, only for principals with validated active Merchant membership
// and the required capability, and only while the runtime-controlled rollback
// flag is enabled (default disabled — changing it never requires rebuilding
// the SPA). An arbitrary external URL is never accepted as a destination.

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/matjeroapps/supplier/internal/actorhttp"
	"github.com/matjeroapps/supplier/internal/coreclient"
	"github.com/matjeroapps/supplier/internal/httpx"
)

// ConsoleCompatibilityService resolves legacy-route redirect eligibility.
type ConsoleCompatibilityService struct {
	core   BootstrapResolver
	config CompatibilityConfig
	logger *slog.Logger
}

// BootstrapResolver resolves the verified subject's merchant workspaces via
// Core. It is satisfied by *coreclient.Client.
type BootstrapResolver interface {
	GetMerchantBootstrap(ctx context.Context, subject string) (*coreclient.MerchantCompatibilityBootstrap, error)
}

// CompatibilityConfig carries the runtime-controlled compatibility policy. The
// master switch lives on the server; flipping it never requires rebuilding the
// Supplier frontend.
type CompatibilityConfig struct {
	// RedirectsEnabled is the rollback/kill-switch. Default disabled: every
	// legacy route serves the legacy application.
	RedirectsEnabled bool
}

// NewConsoleCompatibilityService builds the decision service.
func NewConsoleCompatibilityService(core BootstrapResolver, config CompatibilityConfig, logger *slog.Logger) *ConsoleCompatibilityService {
	if logger == nil {
		logger = slog.Default()
	}
	return &ConsoleCompatibilityService{core: core, config: config, logger: logger}
}

// SetRedirectsEnabled flips the runtime rollback flag. It restores the legacy
// entrypoint as the primary destination immediately, without redeploying or
// rebuilding anything.
func (s *ConsoleCompatibilityService) SetRedirectsEnabled(enabled bool) {
	s.config.RedirectsEnabled = enabled
}

// consoleDestination is a verified Merchant Console equivalent for exactly one
// legacy route. Destinations are always constructed server-side from this
// table — a caller-supplied URL is never accepted.
type consoleDestination struct {
	// legacyRoute is the normalized legacy path (no query).
	legacyRoute string
	// consolePath is the canonical destination under the verified workspace.
	consolePath string
	// requiredSupplyCapability marks destinations that need an active SUPPLY
	// capability in addition to active membership.
	requiredSupplyCapability bool
}

// verifiedRoutes is the route-by-route decision table (T029 evidence lives in
// the implementation report). In Phase 2 only /integrations has a verified,
// fully functional console equivalent (the Supply connections screen with its
// merchant authorization chain); /products, /offers, /inventory, /locations,
// and /retail have no Phase 2 equivalent and remain legacy.
var verifiedRoutes = []consoleDestination{
	{
		legacyRoute:              "/integrations",
		consolePath:              "/dashboard/merchants/%s/supply/connections",
		requiredSupplyCapability: true,
	},
}

type consoleCompatibilityRequest struct {
	// IntentPath is the normalized legacy route/deep-link intent (a path, never
	// an absolute URL). Query values are never consumed.
	IntentPath string `json:"intent_path"`
}

type consoleCompatibilityResponse struct {
	Decision    string `json:"decision"` // redirect | stay
	Reason      string `json:"reason"`
	Destination *struct {
		Path       string `json:"path"`
		MerchantID string `json:"merchant_id"`
	} `json:"destination,omitempty"`
}

// handleConsoleCompatibility handles POST /v1/supplier/console-compatibility.
func (deps Dependencies) handleConsoleCompatibility(w http.ResponseWriter, r *http.Request) {
	if deps.Compatibility == nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "compatibility_unavailable", "compatibility decision unavailable")
		return
	}
	deps.Compatibility.HandleDecision(w, r)
}

// HandleDecision resolves the compatibility decision for the authenticated
// principal. Measurement failures never block the decision path: logging is
// best-effort around the outcome.
func (s *ConsoleCompatibilityService) HandleDecision(w http.ResponseWriter, r *http.Request) {
	subject, err := actorhttp.SubjectFrom(r)
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}

	var req consoleCompatibilityRequest
	if r.Body == nil || r.ContentLength == 0 {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}

	intent, ok := normalizeLegacyIntent(req.IntentPath)
	if !ok {
		s.record(r, subject, req.IntentPath, "stay", "invalid_intent")
		writeDecision(w, "stay", "invalid_intent", nil)
		return
	}

	stay := func(reason string) {
		s.record(r, subject, intent, "stay", reason)
		writeDecision(w, "stay", reason, nil)
	}

	if !s.config.RedirectsEnabled {
		// The rollback flag restores legacy behavior immediately.
		stay("redirects_disabled")
		return
	}

	var destination *consoleDestination
	for _, route := range verifiedRoutes {
		if route.legacyRoute == intent {
			destination = &route
			break
		}
	}
	if destination == nil {
		stay("no_verified_equivalent")
		return
	}

	bootstrap, err := s.core.GetMerchantBootstrap(r.Context(), subject)
	if err != nil {
		// Eligibility could not be established: the user stays on the working
		// legacy route. Redirect failures must never strand anyone.
		stay("eligibility_unresolved")
		return
	}

	for _, ws := range bootstrap.Workspaces {
		if ws.MerchantStatus != "active" || ws.Membership.Status != "active" {
			continue
		}
		if destination.requiredSupplyCapability && (ws.Capabilities == nil || ws.Capabilities.Supply == nil || ws.Capabilities.Supply.Status != "active") {
			continue
		}
		dest := struct {
			Path       string `json:"path"`
			MerchantID string `json:"merchant_id"`
		}{
			// Intent preservation: the console destination path; query/state
			// the destination cannot consume is dropped safely.
			Path:       fmt.Sprintf(destination.consolePath, ws.MerchantID) + "?legacy=supplier",
			MerchantID: ws.MerchantID,
		}
		s.record(r, subject, intent, "redirect", "verified_equivalent")
		writeDecision(w, "redirect", "verified_equivalent", &dest)
		return
	}

	stay("no_active_eligible_membership")
}

// record emits the structured usage/decision evidence through existing
// observability. The subject is pseudonymized (hashed); sensitive query values
// are never logged because intents carry no query.
func (s *ConsoleCompatibilityService) record(r *http.Request, subject, intent, decision, reason string) {
	hash := sha256.Sum256([]byte(subject))
	s.logger.InfoContext(r.Context(), "supplier console compatibility decision",
		"subject_hash", hex.EncodeToString(hash[:8]),
		"route", intent,
		"decision", decision,
		"reason", reason,
	)
}

func writeDecision(w http.ResponseWriter, decision, reason string, destination *struct {
	Path       string `json:"path"`
	MerchantID string `json:"merchant_id"`
}) {
	httpx.WriteJSON(w, http.StatusOK, consoleCompatibilityResponse{
		Decision:    decision,
		Reason:      reason,
		Destination: destination,
	})
}

// normalizeLegacyIntent accepts only a relative legacy path. Origin, scheme,
// host, protocol-relative, and traversal forms are rejected so an arbitrary
// external redirect can never ride in as intent.
func normalizeLegacyIntent(raw string) (string, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || len(trimmed) > 256 {
		return "", false
	}
	if strings.ContainsAny(trimmed, "?#") || strings.Contains(trimmed, "..") {
		return "", false
	}
	if !strings.HasPrefix(trimmed, "/") || strings.HasPrefix(trimmed, "//") {
		return "", false
	}
	return strings.TrimRight(trimmed, "/"), true
}

// RegisterCompatibilityRoutes mounts the compatibility decision endpoint.
func RegisterCompatibilityRoutes(deps Dependencies) func(r chi.Router) {
	return func(r chi.Router) {
		r.Post("/supplier/console-compatibility", deps.handleConsoleCompatibility)
	}
}
