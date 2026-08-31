package main

import (
	"context"
	"log"

	"github.com/matjeroapps/core/packages/auth"
	"github.com/matjeroapps/core/packages/config"
	"github.com/matjeroapps/core/packages/database"
	"github.com/matjeroapps/core/packages/httpx"
	"github.com/matjeroapps/core/packages/logging"
	"github.com/matjeroapps/core/packages/observability"
	"github.com/matjeroapps/core/pkg/actorapi"
	"github.com/matjeroapps/core/pkg/commerce"
	"github.com/matjeroapps/core/pkg/markets"
	"github.com/matjeroapps/supplier/internal/openapi"
	"github.com/matjeroapps/supplier/internal/supplierapi"
)

func main() {
	if err := run(context.Background()); err != nil {
		log.Fatal(err)
	}
}

func run(ctx context.Context) error {
	cfg, err := config.Load("supplier-api")
	if err != nil {
		return err
	}
	logger := logging.New(cfg)
	shutdown, err := observability.Init(ctx, cfg)
	if err != nil {
		return err
	}
	defer func() { _ = shutdown(context.Background()) }()

	db, err := database.Connect(ctx, cfg)
	if err != nil {
		return err
	}
	defer db.Close()

	verifier, err := auth.NewOIDCVerifier(ctx, auth.Config{
		IssuerURL:  cfg.ZitadelIssuer,
		Audience:   cfg.ZitadelAudience,
		RolesClaim: auth.DefaultRolesClaim(),
	})
	if err != nil {
		return err
	}

	repo := commerce.NewRepository(db.Pool)
	service := commerce.NewService(repo)
	marketService := markets.NewService(markets.NewRepository(db.Pool))
	appCfg := httpx.ConfigFrom(cfg)
	router := httpx.NewRouter(httpx.App{
		Config: appCfg,
		Logger: logger,
		Ready: func(ctx context.Context) error {
			return db.Ping(ctx)
		},
	})
	if spec, err := openapi.BuildSupplierSpec(); err == nil {
		if specBytes, err := openapi.MarshalDocument(spec); err == nil {
			router.Mount("/", openapi.NewRouter(openapi.RouterConfig{
				Enabled:   cfg.OpenAPIDocsEnabled,
				SpecPath:  "/openapi.json",
				DocsPath:  "/docs",
				SpecBytes: specBytes,
			}))
		} else {
			return err
		}
	} else {
		return err
	}
	router.Mount("/", actorapi.NewRouter(actorapi.Config{
		AppName:      "Supplier API",
		Actor:        "supplier",
		RequireAuth:  true,
		AllowedRoles: []string{auth.RoleSupplierOwner, auth.RoleSupplierManager, auth.RoleSupplierStaff},
		Register:     supplierapi.RegisterSupplierRoutes(supplierapi.Dependencies{Commerce: service, Repo: repo}),
	}, marketService, verifier))
	return httpx.Run(ctx, appCfg, logger, router)
}
