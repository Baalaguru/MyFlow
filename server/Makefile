.PHONY: build run test tidy fmt vet

build:
	go build -o bin/myflow-api ./cmd/api

run:
	go run ./cmd/api

test:
	go test ./...

tidy:
	go mod tidy

fmt:
	gofmt -w .

vet:
	go vet ./...
