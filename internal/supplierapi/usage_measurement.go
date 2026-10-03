package supplierapi

// Per-route usage measurement for the legacy Supplier API (Feature 025,
// spec FR-027). Evidence for later retirement decisions: every request is
// recorded to the existing structured logger with a pseudonymous subject
// hash — no analytics platform, no behavior change. Measurement must never
// add failure modes to legacy serving: the middleware cannot abort a request.

import (
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/matjeroapps/supplier/internal/auth"
)

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

// UsageMeasurementMiddleware records route, outcome, and a hashed subject for
// every API request. It is fail-open by construction: logging errors are
// dropped by the logger and never surface to the caller.
func UsageMeasurementMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
	if logger == nil {
		logger = slog.Default()
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(recorder, r)

			subjectHash := ""
			if principal, ok := auth.PrincipalFrom(r.Context()); ok && principal.Subject != "" {
				sum := sha256.Sum256([]byte(principal.Subject))
				subjectHash = hex.EncodeToString(sum[:8])
			}
			logger.InfoContext(r.Context(), "supplier_api usage",
				"route", strings.TrimPrefix(r.URL.Path, "/v1"),
				"method", r.Method,
				"status", recorder.status,
				"duration_ms", time.Since(start).Milliseconds(),
				"subject_hash", subjectHash,
			)
		})
	}
}
