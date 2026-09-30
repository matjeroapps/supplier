package observability

import (
	"context"
	"testing"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"

	"github.com/matjeroapps/supplier/internal/config"
)

func TestInitDoesNotConflictWithDefaultResourceSchema(t *testing.T) {
	previousProvider := otel.GetTracerProvider()
	t.Cleanup(func() { otel.SetTracerProvider(previousProvider) })

	shutdown, err := Init(context.Background(), config.Config{
		ServiceName: "supplier-test",
		Environment: "testing",
	})
	if err != nil {
		t.Fatalf("observability.Init failed: %v", err)
	}
	if shutdown == nil {
		t.Fatal("observability.Init returned a nil shutdown function")
	}
	if err := shutdown(context.Background()); err != nil {
		t.Fatalf("observability shutdown failed: %v", err)
	}
}

func TestNewResourcePreservesSupplierAttributes(t *testing.T) {
	res, err := newResource(config.Config{
		ServiceName: "supplier-test",
		Environment: "testing",
	})
	if err != nil {
		t.Fatalf("newResource failed: %v", err)
	}

	attributes := make(map[string]string, res.Len())
	for _, kv := range res.Attributes() {
		if kv.Value.Type() == attribute.STRING {
			attributes[string(kv.Key)] = kv.Value.AsString()
		}
	}
	if got := attributes["service.name"]; got != "supplier-test" {
		t.Fatalf("service.name = %q, want %q", got, "supplier-test")
	}
	if got := attributes["deployment.environment.name"]; got != "testing" {
		t.Fatalf("deployment.environment.name = %q, want %q", got, "testing")
	}
}
