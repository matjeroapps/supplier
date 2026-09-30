# M8-01 Supplier Runtime Readiness Report

## Summary

This remediation repairs Supplier API startup on port 8084. The baseline failed during OpenTelemetry resource construction because `resource.Default()` used schema URL `1.43.0` while the versioned semantic-convention package supplied schema URL `1.37.0`. Supplier now uses stable `attribute` keys with a schema-less resource overlay, so the default resource and Supplier attributes can be merged without a schema conflict.

This report covers only the Supplier repository and the targeted Supplier container runtime proof. It does not approve M8-01 and does not claim any later remediation step.

## Baseline and Branch

- Supplier baseline: `origin/main` at `90a718fe611ea698ac503cc1d2421f2e78e693fd`.
- Implementation branch: `codex/m8-01-supplier-runtime-readiness`.
- Platform-infra was inspected read-only at its existing `main` checkout; no platform-infra files changed.
- The implementation commit SHA and pull-request URL are recorded after push and PR creation.

## Architecture Changes

- `supplier/internal/observability/observability.go` no longer imports a versioned semantic-convention package.
- `Init` delegates resource construction to a small unexported `newResource` seam.
- `newResource` merges `resource.Default()` with schema-less `service.name` and `deployment.environment.name` attributes using `go.opentelemetry.io/otel/attribute`.
- Existing tracer-provider registration, error wrapping, and shutdown behavior remain unchanged.

## Repository Impact

Only these Supplier files are in scope:

- `internal/observability/observability.go`
- `internal/observability/observability_test.go`
- `docs/implementation/m8-01-supplier-runtime-readiness-report.md`

No `go.mod`, `go.sum`, generated API contract, frontend, Core, Seller, or platform-infra file changed.

## Database Changes

None. This remediation does not add or modify migrations, schemas, persistence, or seed data.

## API Changes

None. The existing `/healthz` and `/readyz` operational endpoints are unchanged; this remediation restores the process startup path that makes them reachable.

## Security Considerations

- No credentials, tokens, issuer secrets, or client secrets were added or logged.
- The change removes a versioned import conflict without widening API or authorization boundaries.
- Runtime verification used the existing Compose configuration and did not modify Zitadel or identity-client configuration.

## Pre-Fix Failure Evidence

On the fresh baseline, running `timeout 20s go run ./apps/supplier-api 2>&1` from `supplier/` exited with status `1` and emitted:

```text
create otel resource: conflicting Schema URL: https://opentelemetry.io/schemas/1.43.0 and https://opentelemetry.io/schemas/1.37.0
```

The regression test was written and run against that unchanged baseline before the production edit; it failed for the same schema-conflict reason.

## Verification

All commands below were run on 2026-10-01 from the fresh implementation branch unless noted otherwise:

- `gofmt -s -w internal/observability/observability.go internal/observability/observability_test.go` — PASS.
- `git diff --check` — PASS.
- Supplier Go import audit for `go.opentelemetry.io/otel/semconv/v*` — no matches.
- `go test ./internal/observability` — PASS.
- `go test -count=10 ./internal/observability` — PASS.
- `go vet ./...` — PASS.
- `go test ./...` — PASS.

The regression coverage verifies successful real `Init` initialization and clean shutdown, restores the prior global tracer provider, and asserts the expected Supplier service/environment attributes.

## Runtime Verification

From `platform-infra/`, Compose validation passed, Zitadel was reachable and healthy, and host port 8084 was unambiguous. Only `supplier-api` was built and force-recreated.

- Image ID: `sha256:824d4b38fd6adbcd052ac69cda6c7288cb8608b1e731070b813882d70a8cc7cb`.
- Container ID: `ff95ab5a3a2ac3a410f4874ea951a9eca866a4dd27458531d2f932ea7fe4f76e`.
- Container created: `2026-09-30T22:55:44.505901297Z`.
- Container started: `2026-09-30T22:55:44.929041728Z`.
- Container state: running, exit code `0`.
- Running container image ID exactly matched the freshly built image ID.
- Startup log: `http server starting`, service `supplier-api`, environment `development`, address `:8080`.
- `GET http://localhost:8084/healthz` — HTTP `200`, `{"service":"supplier-api","status":"ok"}`.
- `GET http://localhost:8084/readyz` — HTTP `200`, `{"service":"supplier-api","status":"ready"}`.
- No schema-conflict or fatal startup error appeared in the sanitized Supplier log.

## Files Changed

- `internal/observability/observability.go`
- `internal/observability/observability_test.go`
- `docs/implementation/m8-01-supplier-runtime-readiness-report.md`

## Known Limitations

- This is a bounded Supplier runtime remediation. It does not repair the Platform Docker/UI SDK build, configure Seller or Supplier Zitadel clients, diagnose Storefront products, rerun `make up-all`, execute the KSA/SAR pilot, or run the Seller Settings rollback drill.
- Core connectivity, onboarding, end-to-end commerce flows, and the complete M8 gate remain outside this change and are not claimed as verified.
- Remote CI and review state are recorded separately after the PR is opened; local PASS results do not imply remote CI or merge approval.

## Final Verification Status

- Local Supplier code gates: PASS.
- Fresh targeted Supplier container build and runtime probes: PASS.
- Platform-infra source changes: none.
- Pull request: pending creation at the time of this report revision.
- Merge state: not merged; no merge action is authorized by this task.
- M8-01 gate: NOT APPROVED. Later remediation remains ordered and outstanding.
