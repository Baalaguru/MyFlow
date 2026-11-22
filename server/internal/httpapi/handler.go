package httpapi

import (
	"log/slog"
	"net/http"

	"github.com/myflow/myflow/server/internal/db"
)

const apiPrefix = "/v1"

func NewHandler(logger *slog.Logger, pool *db.Pool, environment string) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", healthHandler(pool, environment))
	mux.HandleFunc("GET "+apiPrefix+"/health", healthHandler(pool, environment))
	mux.HandleFunc(apiPrefix+"/", notFoundHandler)

	return withMiddleware(logger, mux)
}

func notFoundHandler(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotFound, "not_found", "Endpoint not found")
}
