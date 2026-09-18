package coreclient

import (
	"context"
	"fmt"
	"net/url"
	"time"
)

type SupplierSyncJobResponse struct {
	ID             string     `json:"id"`
	ConnectionID   string     `json:"connection_id"`
	SupplierID     string     `json:"supplier_id"`
	Status         string     `json:"status"`
	TotalItems     int        `json:"total_items"`
	ProcessedItems int        `json:"processed_items"`
	FailedItems    int        `json:"failed_items"`
	ErrorSummary   string     `json:"error_summary,omitempty"`
	StartedAt      *time.Time `json:"started_at,omitempty"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type createSupplierSyncJobRequest struct {
	ConnectionID string `json:"connection_id"`
	SupplierID   string `json:"supplier_id"`
}

func (c *Client) CreateSupplierSyncJob(ctx context.Context, subject, connectionID, supplierID string) (*SupplierSyncJobResponse, error) {
	req := createSupplierSyncJobRequest{
		ConnectionID: connectionID,
		SupplierID:   supplierID,
	}
	var res SupplierSyncJobResponse
	if err := c.post(ctx, "/internal/v1/integrations/suppliers/sync-jobs", req, requestOptions{Subject: subject}, &res); err != nil {
		return nil, fmt.Errorf("create supplier sync job: %w", err)
	}
	return &res, nil
}

func (c *Client) GetSupplierSyncJob(ctx context.Context, subject, jobID string) (*SupplierSyncJobResponse, error) {
	path := fmt.Sprintf("/internal/v1/integrations/suppliers/sync-jobs/%s", url.PathEscape(jobID))
	var res SupplierSyncJobResponse
	if err := c.get(ctx, path, nil, requestOptions{Subject: subject}, &res); err != nil {
		return nil, fmt.Errorf("get supplier sync job: %w", err)
	}
	return &res, nil
}

func (c *Client) ListSupplierSyncJobs(ctx context.Context, subject, supplierID string) ([]SupplierSyncJobResponse, error) {
	query := url.Values{}
	if supplierID != "" {
		query.Set("supplier_id", supplierID)
	}
	var res collectionResponse[SupplierSyncJobResponse]
	if err := c.get(ctx, "/internal/v1/integrations/suppliers/sync-jobs", query, requestOptions{Subject: subject}, &res); err != nil {
		return nil, fmt.Errorf("list supplier sync jobs: %w", err)
	}
	return res.Items, nil
}
