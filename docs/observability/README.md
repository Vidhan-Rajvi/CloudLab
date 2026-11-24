# CloudLab Observability Documentation (Phase 8)

This directory contains validation reports and operational documentation for the CloudLab observability stack implemented across Phases 8.1–8.13.

## Components
- **Structured Logging & Request Correlation (`backend/app/utils/logger.py`, `backend/app/middleware/request_logging.py`):** Single-line JSON logs with UTC timestamps, log levels, `request_id` propagation (`X-Request-ID`), and HTTP duration/status metadata.
- **Health & Readiness Endpoints (`backend/app/routers/health.py`):** `/health/live` liveness probe and `/health/ready` dependency check for PostgreSQL and Redis.
- **Metrics Collection (`prometheus/prometheus.yml`):** Scrapes Prometheus (`9090`), FastAPI backend (`8000/metrics`), background worker (`9100/metrics`), and cAdvisor (`8080/metrics`) every `15s`.
- **Provisioned Dashboards (`grafana/dashboards/`):**
  - `cloudlab-application-performance.json`
  - `cloudlab-worker-monitoring.json`
  - `cloudlab-docker-infrastructure.json`

## Validation Artifacts
- [`phase-8.12-validation-report.md`](./phase-8.12-validation-report.md) — Production logging, metrics, and controlled error validation results.
- [`phase-8.13-final-validation-report.md`](./phase-8.13-final-validation-report.md) — Final end-to-end observability verification, metric notes, and Git integration summary.
