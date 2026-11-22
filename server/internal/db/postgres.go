package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool wraps the PostgreSQL connection pool so callers do not depend on pgx types.
type Pool struct {
	*pgxpool.Pool
}

func Connect(ctx context.Context, dsn string) (*Pool, error) {
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}

	config.MaxConns = 8
	config.MinConns = 0

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &Pool{Pool: pool}, nil
}

func (p *Pool) Healthy(ctx context.Context) bool {
	if p == nil {
		return false
	}
	return p.Ping(ctx) == nil
}
