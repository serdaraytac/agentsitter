# Go Microservices Rules

## Instructions
Go 1.22 monorepo with multiple microservices communicating over gRPC. Each service owns
its domain: auth/, orders/, inventory/. Shared proto definitions live in proto/; generated
stubs in gen/. Prefer the standard library; add dependencies only with a clear justification.

- Use `go vet` and `staticcheck` — CI rejects any warnings.
- Table-driven tests for all pure functions; use `testify/assert` for assertions.
- Each gRPC handler must have a corresponding integration test in *_integration_test.go.
- Document all exported types and functions with godoc comments.

## Style
- Return errors explicitly — never panic in production code paths.
- Wrap errors with context: `fmt.Errorf("serviceName.operationName: %w", err)`.
- Prefer single-method interfaces (io.Reader, io.Writer pattern) for testability.
- Use `context.Context` as the first parameter on every function that does I/O.
- Use proper error handling and wrapping throughout the codebase.
- Create a feature branch from main for each task.
- Create a feature branch from main for each task.

## Rules
- NEVER hardcode service URLs or credentials — use environment variables or a config struct.
- ALWAYS add a distributed trace span for every gRPC handler (use otel/trace).
- MUST add a changelog entry for every user-facing change before merging.
