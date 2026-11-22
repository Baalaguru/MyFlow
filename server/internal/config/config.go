package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// Config holds all environment-driven settings. No secrets live in source.
type Config struct {
	Addr          string
	LogLevel      string
	DatabaseURL   string
	MigrationsDir string
	Environment   string
	ShutdownWait  time.Duration
}

func Load() (Config, error) {
	cfg := Config{
		Addr:          env("MYFLOW_ADDR", ":8080"),
		LogLevel:      strings.ToLower(env("MYFLOW_LOG_LEVEL", "info")),
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		MigrationsDir: env("MYFLOW_MIGRATIONS_DIR", "migrations"),
		Environment:   env("MYFLOW_ENV", "development"),
		ShutdownWait:  10 * time.Second,
	}

	switch cfg.LogLevel {
	case "debug", "info", "warn", "error":
	default:
		return Config{}, fmt.Errorf("invalid MYFLOW_LOG_LEVEL %q", cfg.LogLevel)
	}

	if cfg.Addr == "" {
		return Config{}, fmt.Errorf("MYFLOW_ADDR must not be empty")
	}

	return cfg, nil
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
