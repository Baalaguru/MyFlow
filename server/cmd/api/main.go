package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/myflow/myflow/server/internal/config"
	"github.com/myflow/myflow/server/internal/db"
	"github.com/myflow/myflow/server/internal/httpapi"
	"github.com/myflow/myflow/server/internal/logging"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("configuration error", "error", err)
		os.Exit(1)
	}

	logger := logging.New(cfg.LogLevel)
	slog.SetDefault(logger)

	var pool *db.Pool
	if cfg.DatabaseURL != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		pool, err = db.Connect(ctx, cfg.DatabaseURL)
		if err != nil {
			logger.Error("database unavailable; starting in local-only mode", "error", err)
		} else {
			defer pool.Close()
			logger.Info("database connected")
			if err := db.Migrate(context.Background(), pool, cfg.MigrationsDir); err != nil {
				logger.Error("database migration failed", "error", err)
				os.Exit(1)
			}
			logger.Info("database migrations applied", "directory", cfg.MigrationsDir)
		}
	} else {
		logger.Info("DATABASE_URL not set; starting without database")
	}

	handler := httpapi.NewHandler(logger, pool, cfg.Environment)

	server := &http.Server{
		Addr:              cfg.Addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("server listening", "addr", cfg.Addr, "environment", cfg.Environment)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server failed", "error", err)
			stop()
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
		os.Exit(1)
	}
	logger.Info("server stopped cleanly")
}
