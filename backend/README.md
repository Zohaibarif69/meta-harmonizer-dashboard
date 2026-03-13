# MetaHarmonizer Backend API

Production-ready FastAPI backend for the MetaHarmonizer schema mapping engine. Includes complete REST API endpoints, metrics evaluation, mapper execution management, and health checks.

## Features

- ✅ **REST API** - Complete OpenAPI specification with automatic documentation
- ✅ **Health Checks** - Kubernetes-compatible liveness and readiness probes
- ✅ **Metrics Management** - Retrieve, cache, and refresh evaluation metrics
- ✅ **Mapper Execution** - Trigger mapper jobs with progress tracking
- ✅ **Job Management** - Queue, monitor, and cancel mapper execution jobs
- ✅ **Error Handling** - Global exception handling with request tracking
- ✅ **Request Logging** - Unique request IDs for debugging and tracing
- ✅ **CORS Support** - Frontend communication fully configured
- ✅ **Environment Config** - 12+ configurable settings via .env
- ✅ **Logging Framework** - Rotating file logger with console output
- ✅ **Type Safety** - Pydantic models for all request/response validation
- ✅ **Background Tasks** - async/await support for long-running operations

## Architecture

### Directory Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── models.py              # Pydantic request/response models
├── requirements.txt       # Python dependencies
├── .env.example          # Environment configuration template
├── .gitignore            # Git ignore rules
├── README.md             # This file
├── DEPLOYMENT.md         # Deployment guide
├── routers/              # API endpoint implementations
│   ├── __init__.py
│   ├── health.py         # Health check endpoints
│   ├── metrics.py        # Metrics endpoints
│   └── mapper.py         # Mapper execution endpoints
└── utils/                # Utility modules
    ├── __init__.py       # Logging setup
    └── config.py         # Configuration management
```

### API Endpoints

#### Health Checks
- `GET /api/health` - Basic health check
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe
- `GET /healthz` - Kubernetes health (short form)
- `GET /readyz` - Kubernetes ready (short form)

#### Metrics
- `GET /api/metrics` - Full metrics evaluation
- `GET /api/metrics/summary` - Quick metrics overview
- `GET /api/metrics/confidence-distribution` - Confidence score distribution
- `GET /api/metrics/method-performance` - Performance by method
- `GET /api/metrics/failure-analysis` - Failure case analysis
- `GET /api/metrics/stats` - Detailed statistics
- `POST /api/metrics/refresh` - Clear cache and reload

#### Mapper Execution
- `POST /api/mapper/run` - Trigger mapper job
- `GET /api/mapper/status/{job_id}` - Check job progress
- `GET /api/mapper/result/{job_id}` - Get job results
- `GET /api/mapper/jobs` - List all jobs
- `POST /api/mapper/cancel/{job_id}` - Cancel running job
- `GET /api/mapper/config` - Get mapper configuration

#### Root
- `GET /` - API information
- `GET /api` - API details and endpoints

## Setup & Installation

### 1. Prerequisites

- Python 3.8+
- pip or conda

### 2. Create Virtual Environment

```bash
# Using venv
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit .env with your settings
# Default settings should work for local development
```

### 5. Run Server

**Development (with hot reload):**
```bash
python main.py
```

**Production (using uvicorn directly):**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Using environment variables:**
```bash
HOST=0.0.0.0 PORT=8000 ENVIRONMENT=production python main.py
```

### 6. Verify Installation

```bash
# Check health
curl http://localhost:8000/api/health

# View API documentation
# Open browser: http://localhost:8000/api/docs
```

## Configuration

All settings are in `.env` file. Key configurations:

### Server
```
HOST=127.0.0.1          # Server listen address
PORT=8000               # Server port
ENVIRONMENT=development # dev or production
DEBUG=True              # Enable debug mode
```

### Mapper
```
DEFAULT_MAPPER_METHOD=rag              # fts, st, bi_encoder, lm, rag, synonym
MAPPER_TIMEOUT=300                     # Timeout in seconds
MAPPER_BATCH_SIZE=100                  # Items per batch
ENABLE_MAPPER_EXECUTION=True           # Enable/disable mapper
```

### Cache
```
CACHE_ENABLED=True      # Enable caching
CACHE_TTL=3600          # Cache time-to-live (seconds)
CACHE_MAX_SIZE=100      # Max cached items
```

### Features
```
ENABLE_MAPPER_EXECUTION=True           # Allow mapper jobs
ENABLE_METRICS_EVALUATION=True         # Return metrics data
ENABLE_CACHING=True                    # Cache responses
ENABLE_WEB_UI=True                     # Enable interactive docs
```

### CORS
```
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
CORS_ALLOW_CREDENTIALS=True
```

### Logging
```
LOG_LEVEL=INFO                         # DEBUG, INFO, WARNING, ERROR
LOG_FILE=backend.log                   # Log file location
```

## Usage Examples

### Get Metrics
```python
import requests

response = requests.get('http://localhost:8000/api/metrics')
metrics = response.json()
print(f"Accuracy: {metrics['metrics']['accuracy']}")
```

### Run Mapper
```python
# Trigger mapper
response = requests.post('http://localhost:8000/api/mapper/run', json={
    "mapper_method": "rag",
    "use_cache": True
})
job_id = response.json()['job_id']

# Check status
response = requests.get(f'http://localhost:8000/api/mapper/status/{job_id}')
status = response.json()
print(f"Progress: {status['progress']*100}%")

# Get results
response = requests.get(f'http://localhost:8000/api/mapper/result/{job_id}')
result = response.json()
```

### Frontend Integration
```javascript
// fetch metrics
const metrics = await fetch('http://localhost:8000/api/metrics')
  .then(r => r.json());

// trigger mapper
const job = await fetch('http://localhost:8000/api/mapper/run', {
  method: 'POST',
  body: JSON.stringify({ mapper_method: 'rag' })
}).then(r => r.json());
```

## API Documentation

### Interactive Documentation
- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

### OpenAPI Spec
- JSON: `http://localhost:8000/api/openapi.json`

## Monitoring & Debugging

### Logs
```bash
# View recent logs
tail -f logs/backend.log

# Search in logs
grep ERROR logs/backend.log
```

### Request Tracking
Each request gets a unique ID (`X-Request-ID` header) for end-to-end tracing:
```bash
# In logs
[b3f8a2c5-1234-5678] GET /api/metrics - Client: 127.0.0.1

# In response headers
X-Request-ID: b3f8a2c5-1234-5678
```

### Health Monitoring
```bash
# Simple health check
curl http://localhost:8000/api/health

# Kubernetes readiness
curl http://localhost:8000/readyz

# All jobs status
curl http://localhost:8000/api/mapper/jobs
```

## Testing

### Using curl
```bash
# Health check
curl http://localhost:8000/api/health

# Get metrics
curl http://localhost:8000/api/metrics

# Run mapper
curl -X POST http://localhost:8000/api/mapper/run \
  -H "Content-Type: application/json" \
  -d '{"mapper_method": "rag"}'

# Check job status
curl http://localhost:8000/api/mapper/status/YOUR_JOB_ID
```

### Using httpie
```bash
# Health
http :8000/api/health

# Metrics
http :8000/api/metrics

# Run mapper
http POST :8000/api/mapper/run mapper_method=rag

# Job status
http :8000/api/mapper/status/YOUR_JOB_ID
```

## Performance Optimization

### Caching
Metrics are cached by default (TTL: 1 hour). Disable cache per request:
```bash
curl http://localhost:8000/api/metrics?use_cache=false
```

### Multiple Workers
For production, use multiple worker processes:
```bash
uvicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
```

### Database Connection Pooling
The mapper uses connection pooling for NCI/UMLS databases (configured in mapper config).

## Error Handling

All errors return consistent format:
```json
{
  "error": "MAPPER_ERROR",
  "detail": "Detailed error message",
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "req-12345"
}
```

Common status codes:
- `200` - Success
- `202` - Job accepted (async operation)
- `400` - Bad request
- `404` - Not found
- `500` - Server error
- `503` - Service unavailable

## Security Considerations

### Production Setup
1. Set `DEBUG=False` in .env
2. Configure allowed CORS origins
3. Use HTTPS/SSL in production
4. Set secure environment variables
5. Use production database credentials

### API Keys (Future)
Prepared for API key authentication - extend `add_request_id` middleware for key validation.

## Troubleshooting

### Port Already in Use
```bash
# Change port in .env
PORT=8001
```

### CORS Errors
```bash
# Check CORS_ORIGINS in .env
# Should include your frontend URL
CORS_ORIGINS=http://localhost:3000,http://your-domain.com
```

### Mapper Timeout
```bash
# Increase timeout in .env
MAPPER_TIMEOUT=600  # 10 minutes
```

### Metrics File Not Found
Falls back to sample data automatically. Create `mapper_evaluation_metrics.json` in root for real data.

## Version Information

- **Backend Version**: 1.0.0
- **Python**: 3.8+
- **FastAPI**: 0.104.1+
- **Uvicorn**: 0.24.0+

## Next Steps

1. **Frontend Integration**: Connect React dashboard to backend endpoints
2. **cBioPortal Integration**: Add cBioPortal export functionality
3. **Database**: Replace sample data with real mapper results
4. **Authentication**: Add JWT token validation
5. **Monitoring**: Integration with Prometheus/Grafana

## Support

For issues or questions:
1. Check logs: `logs/backend.log`
2. View API docs: `http://localhost:8000/api/docs`
3. Check request ID in response headers for tracing
