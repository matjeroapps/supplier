package config

import "testing"

func TestLoadDefaults(t *testing.T) {
	t.Setenv("APP_ENV", "")
	t.Setenv("HTTP_ADDR", "")
	t.Setenv("SHUTDOWN_TIMEOUT_SECONDS", "")

	cfg, err := Load("admin-api")
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}

	if cfg.ServiceName != "admin-api" {
		t.Fatalf("service name = %q", cfg.ServiceName)
	}
	if cfg.HTTPAddr != ":8080" {
		t.Fatalf("HTTPAddr = %q", cfg.HTTPAddr)
	}
	if cfg.ZitadelAudience != "admin-api" {
		t.Fatalf("ZitadelAudience = %q", cfg.ZitadelAudience)
	}
	if cfg.ZitadelDiscoveryURL != cfg.ZitadelIssuer {
		t.Fatalf("ZitadelDiscoveryURL default = %q, expected %q", cfg.ZitadelDiscoveryURL, cfg.ZitadelIssuer)
	}
}

func TestLoadZitadelDiscoveryURL(t *testing.T) {
	t.Setenv("ZITADEL_DISCOVERY_URL", "http://zitadel-internal:8080")

	cfg, err := Load("supplier-api")
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}

	if cfg.ZitadelDiscoveryURL != "http://zitadel-internal:8080" {
		t.Fatalf("ZitadelDiscoveryURL = %q, expected %q", cfg.ZitadelDiscoveryURL, "http://zitadel-internal:8080")
	}
}

func TestLoadZitadelAudienceOverride(t *testing.T) {
	t.Setenv("ZITADEL_AUDIENCE", "custom-supplier-project-id")

	cfg, err := Load("supplier-api")
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}

	if cfg.ZitadelAudience != "custom-supplier-project-id" {
		t.Fatalf("ZitadelAudience = %q, expected %q", cfg.ZitadelAudience, "custom-supplier-project-id")
	}
}

func TestLoadRejectsInvalidShutdownTimeout(t *testing.T) {
	t.Setenv("SHUTDOWN_TIMEOUT_SECONDS", "nope")

	if _, err := Load("admin-api"); err == nil {
		t.Fatal("expected invalid timeout error")
	}
}
