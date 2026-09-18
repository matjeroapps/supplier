package supplierapi

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/matjeroapps/supplier/internal/actorhttp"
	"github.com/matjeroapps/supplier/internal/httpx"
)

func (deps Dependencies) handleCreateSupplierSyncJob(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	var body CreateSyncJobRequest
	if !actorhttp.DecodeJSON(w, r, &body) {
		return
	}
	connID := body.ConnectionID
	if connID == "" {
		connID = "default"
	}

	job, err := deps.Core.CreateSupplierSyncJob(r.Context(), subject, connID, supplierID)
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, SupplierSyncJobResponse{
		ID:             job.ID,
		ConnectionID:   job.ConnectionID,
		SupplierID:     job.SupplierID,
		Status:         job.Status,
		TotalItems:     job.TotalItems,
		ProcessedItems: job.ProcessedItems,
		FailedItems:    job.FailedItems,
		ErrorSummary:   job.ErrorSummary,
	})
}

func (deps Dependencies) handleGetSupplierSyncJob(w http.ResponseWriter, r *http.Request) {
	subject, _, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	jobID := chi.URLParam(r, "id")
	job, err := deps.Core.GetSupplierSyncJob(r.Context(), subject, jobID)
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, SupplierSyncJobResponse{
		ID:             job.ID,
		ConnectionID:   job.ConnectionID,
		SupplierID:     job.SupplierID,
		Status:         job.Status,
		TotalItems:     job.TotalItems,
		ProcessedItems: job.ProcessedItems,
		FailedItems:    job.FailedItems,
		ErrorSummary:   job.ErrorSummary,
	})
}

func (deps Dependencies) handleListSupplierSyncJobs(w http.ResponseWriter, r *http.Request) {
	subject, supplierID, ok := deps.supplierID(w, r)
	if !ok {
		return
	}
	jobs, err := deps.Core.ListSupplierSyncJobs(r.Context(), subject, supplierID)
	if err != nil {
		actorhttp.WriteCoreError(w, err)
		return
	}
	items := make([]SupplierSyncJobResponse, 0, len(jobs))
	for _, job := range jobs {
		items = append(items, SupplierSyncJobResponse{
			ID:             job.ID,
			ConnectionID:   job.ConnectionID,
			SupplierID:     job.SupplierID,
			Status:         job.Status,
			TotalItems:     job.TotalItems,
			ProcessedItems: job.ProcessedItems,
			FailedItems:    job.FailedItems,
			ErrorSummary:   job.ErrorSummary,
		})
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}
