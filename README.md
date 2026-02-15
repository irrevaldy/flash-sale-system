# High-Throughput Flash Sale System

## Project Overview
A robust, scalable flash sale platform that handles thousands of concurrent users attempting to purchase a limited-stock product. The system ensures fairness (one item per user), prevents overselling, and provides real-time sale status.

## System Architecture

### Technology Stack
- **Backend**: Node.js + Express + TypeScript
- **Database**: Redis (in-memory for high performance)
- **Frontend**: React + TypeScript + Vite
- **Testing**: Jest + Supertest + Artillery (load testing)
- **Deployment**: Render (free tier) / Railway / Fly.io

### Architecture Diagram
```
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────────────────────────────┐
│     Load Balancer (Cloud)           │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Express API Server                │
│  ┌───────────────────────────────┐  │
│  │  Rate Limiting Middleware     │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Sale Status Controller       │  │
│  │  Purchase Controller          │  │
│  │  User Verification Controller │  │
│  └───────────────────────────────┘  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Redis (In-Memory Database)        │
│  ┌───────────────────────────────┐  │
│  │  Sale Configuration           │  │
│  │  Stock Counter (Atomic)       │  │
│  │  User Purchase Set            │  │
│  │  Rate Limit Counters          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Data Model (Redis)
```
Keys:
- sale:config          → Hash {startTime, endTime, totalStock, productName}
- sale:stock           → Integer (atomic counter)
- sale:purchases       → Set (userId: timestamp)
- ratelimit:{userId}   → String (TTL-based)
```

### Concurrency Control Strategy
1. **Redis Atomic Operations**: Use DECR for stock management
2. **Lua Scripts**: Ensure atomicity for check-and-purchase operations
3. **Idempotency**: Check user purchase history before allowing purchase
4. **Rate Limiting**: Prevent spam requests from single users

## Quick Start Guide

### Prerequisites
- Node.js 18+ installed
- Git installed
- Code editor (VS Code recommended)

### Installation Steps

1. **Clone and Setup**
```bash
# Create project directory
mkdir flash-sale-system
cd flash-sale-system

# Initialize git
git init
```

2. **Backend Setup**
```bash
# Create backend directory
mkdir backend
cd backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express cors dotenv ioredis express-rate-limit
npm install -D typescript @types/node @types/express @types/cors ts-node nodemon jest @types/jest supertest @types/supertest ts-jest

# Initialize TypeScript
npx tsc --init
```

3. **Frontend Setup**
```bash
# Go back to root
cd ..

# Create React app with Vite
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install axios
```

4. **Run Locally**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

5. **Run Tests**
```bash
cd backend
npm test
npm run test:load
```

## Deployment Guide

### Option 1: Render (Recommended - Free Tier)

**Backend Deployment:**
1. Push code to GitHub
2. Go to render.com → New → Web Service
3. Connect repository
4. Configure:
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`
   - Add Environment Variable: `REDIS_URL` (use free Redis provider)

**Frontend Deployment:**
1. Render → New → Static Site
2. Configure:
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`
   - Add Environment Variable: `VITE_API_URL` = your backend URL

### Option 2: Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Deploy backend: `railway up` (in backend directory)
4. Deploy frontend: `railway up` (in frontend directory)

### Option 3: Fly.io

1. Install flyctl
2. `fly launch` in backend directory
3. `fly launch` in frontend directory

## Project Structure
```
flash-sale-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── redis.ts
│   │   ├── controllers/
│   │   │   ├── saleController.ts
│   │   │   └── purchaseController.ts
│   │   ├── middleware/
│   │   │   └── rateLimiter.ts
│   │   ├── services/
│   │   │   ├── saleService.ts
│   │   │   └── purchaseService.ts
│   │   ├── utils/
│   │   │   └── luaScripts.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── server.ts
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FlashSale.tsx
│   │   │   └── StatusDisplay.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Key Features Implemented

### Concurrency Control
- ✅ Atomic stock decrement using Redis DECR
- ✅ Lua script for atomic check-purchase-record operation
- ✅ Prevents overselling even under high load

### Fairness & Rules
- ✅ One item per user enforcement
- ✅ User purchase tracking in Redis Set
- ✅ Sale period validation (start/end time)

### Performance & Scalability
- ✅ In-memory Redis for sub-millisecond operations
- ✅ Horizontal scaling ready (stateless API)
- ✅ Rate limiting to prevent abuse
- ✅ Efficient data structures (Sets, Atomic Counters)

### Testing
- ✅ Unit tests for business logic
- ✅ Integration tests for API endpoints
- ✅ Load tests simulating 1000+ concurrent users
- ✅ Stress tests for race condition validation

## Testing Results Expected

### Load Test Metrics
- **Concurrent Users**: 1000+
- **Success Rate**: 100% (no overselling)
- **Response Time**: < 100ms (p95)
- **Throughput**: 5000+ requests/second

### Stress Test Validation
- ✅ No duplicate purchases per user
- ✅ Exact stock count maintained
- ✅ Graceful handling when sold out
- ✅ Proper error messages for all edge cases

## API Endpoints

### GET /api/sale/status
Get current sale status

**Response:**
```json
{
  "status": "active",
  "startTime": "2026-02-14T10:00:00Z",
  "endTime": "2026-02-14T12:00:00Z",
  "totalStock": 100,
  "remainingStock": 45,
  "productName": "Limited Edition Widget"
}
```

### POST /api/sale/purchase
Attempt to purchase item

**Request:**
```json
{
  "userId": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Purchase successful!",
  "remainingStock": 44
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "You have already purchased this item",
  "remainingStock": 44
}
```

### GET /api/sale/user/:userId
Check if user has purchased

**Response:**
```json
{
  "hasPurchased": true,
  "purchaseTime": "2026-02-14T10:15:30Z"
}
```

## Design Decisions & Trade-offs

### Why Redis?
- **Pro**: Sub-millisecond latency, atomic operations, perfect for high-concurrency
- **Con**: Data volatility (mitigated with persistence configuration)
- **Trade-off**: Chose performance over complex relational features

### Why In-Memory Mocking for Local Dev?
- **Pro**: No external dependencies, faster testing, easier setup
- **Con**: Not production-realistic
- **Trade-off**: Provide both options (can connect to real Redis in cloud)

### Why Stateless API?
- **Pro**: Easy horizontal scaling, no session management
- **Con**: Slight overhead in Redis lookups
- **Trade-off**: Scalability over minor performance hit

### Why Single Product?
- **Pro**: Simplified concurrency control, clearer demonstration
- **Con**: Less realistic e-commerce scenario
- **Trade-off**: Project scope vs. comprehensive feature set

## Monitoring & Observability

### Health Checks
```bash
curl http://localhost:3000/health
```

### Metrics to Monitor
- Request latency (p50, p95, p99)
- Stock remaining
- Purchase success/failure rate
- Active connections
- Redis memory usage

## Troubleshooting

### Issue: "Redis connection failed"
**Solution**: Check REDIS_URL environment variable or ensure Redis is running

### Issue: "Overselling detected in tests"
**Solution**: Ensure Lua script is properly configured for atomic operations

### Issue: "High latency under load"
**Solution**: Check Redis configuration, consider connection pooling

### Issue: "CORS errors"
**Solution**: Ensure backend CORS is configured for frontend domain

## Next Steps (Post-Submission Improvements)

1. Add admin dashboard for sale configuration
2. Implement waiting room for queue management
3. Add webhook notifications for purchase confirmations
4. Implement distributed locking for multi-region deployment
5. Add analytics dashboard for sale performance

## License
MIT

## Contact
For questions or issues, please open a GitHub issue.
