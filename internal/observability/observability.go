package observability

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"

	"github.com/matjeroapps/supplier/internal/config"
)

type Shutdown func(context.Context) error

func Init(ctx context.Context, cfg config.Config) (Shutdown, error) {
	res, err := newResource(cfg)
	if err != nil {
		return nil, fmt.Errorf("create otel resource: %w", err)
	}

	provider := sdktrace.NewTracerProvider(
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(provider)

	return provider.Shutdown, nil
}

func newResource(cfg config.Config) (*resource.Resource, error) {
	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			"",
			attribute.String("service.name", cfg.ServiceName),
			attribute.String("deployment.environment.name", cfg.Environment),
		),
	)
	if err != nil {
		return nil, err
	}
	return res, nil
}
