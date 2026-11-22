package httpapi

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/myflow/myflow/server/internal/db"
)

type healthResponse struct {
	Status      string `json:"status"`
	Environment string `json:"environment"`
	Database    string `json:"database"`
	Version     string `json:"version"`
	Time        string `json:"time"`
}

func healthHandler(pool *db.Pool, environment string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		database := "disabled"
		status := "ok"

		if pool != nil {
			ctx, cancel := contextWithTimeout(r, 2*time.Second)
			defer cancel()
			if pool.Healthy(ctx) {
				database = "connected"
			} else {
				database = "unavailable"
				status = "degraded"
			}
		}

		writeJSON(w, http.StatusOK, healthResponse{
			Status:      status,
			Environment: environment,
			Database:    database,
			Version:     "0.1.0",
			Time:        time.Now().UTC().Format(time.RFC3339),
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
