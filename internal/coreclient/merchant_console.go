package coreclient

// Merchant Console bootstrap access for the Supplier compatibility decision
// (Feature 025). The Supplier API calls Core's subject-oriented bootstrap with
// its own service identity and the verified subject, to validate active
// Merchant membership and Supply capability eligibility for legacy redirect
// decisions. The browser never calls Core.

import (
	"context"
)

// MerchantCompatibilityWorkspace is the minimal workspace projection the
// compatibility decision needs. Nothing beyond eligibility facts is consumed.
type MerchantCompatibilityWorkspace struct {
	MerchantID     string `json:"merchant_id"`
	MerchantCode   string `json:"merchant_code"`
	LegalName      string `json:"legal_name"`
	MerchantStatus string `json:"merchant_status"`
	Membership     struct {
		ID          string   `json:"id"`
		Status      string   `json:"status"`
		Permissions []string `json:"permissions"`
	} `json:"membership"`
	Capabilities *struct {
		Retail *struct {
			Status string `json:"status"`
		} `json:"retail"`
		Supply *struct {
			Status string `json:"status"`
		} `json:"supply"`
	} `json:"capabilities,omitempty"`
}

// MerchantCompatibilityBootstrap is the subset of Core's bootstrap response the
// compatibility decision consumes.
type MerchantCompatibilityBootstrap struct {
	Subject    string                           `json:"subject"`
	Workspaces []MerchantCompatibilityWorkspace `json:"workspaces"`
	Meta       struct {
		ContractVersion string `json:"contract_version"`
	} `json:"meta"`
}

// GetMerchantBootstrap resolves the verified subject's merchant workspaces via
// Core using the Supplier service identity.
func (c *Client) GetMerchantBootstrap(ctx context.Context, subject string) (*MerchantCompatibilityBootstrap, error) {
	var out MerchantCompatibilityBootstrap
	if err := c.get(ctx, "/internal/v1/merchants/bootstrap", nil, requestOptions{Subject: subject}, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
