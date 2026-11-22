package httpapi

import (
	"net/http"
	"time"
)

type errorResponse struct {
	Type      string `json:"type"`
	Title     string `json:"title"`
	Status    int    `json:"status"`
	Code      string `json:"code"`
	TraceID   string `json:"trace_id"`
	Detail    string `json:"detail"`
	Timestamp string `json:"timestamp"`
}

func writeError(w http.ResponseWriter, status int, code, detail string) {
	writeJSON(w, status, errorResponse{
		Type:      "https://myflow.local/problems/" + code,
		Title:     http.StatusText(status),
		Status:    status,
		Code:      code,
		TraceID:   "",
		Detail:    detail,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}
