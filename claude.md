# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a microservices-based personal finance application with the following structure:

### Backend - .NET 10 Microservices
All backend services target .NET 10.0 with nullable reference types and implicit usings enabled:

- **Spender.API** - Main web API service (entry point)
- **Spender.Shared** - Common models and utilities (referenced by all services)
- **Spender.Auth** - Authentication service
- **Spender.Transactions** - Transaction management
- **Spender.Categories** - Category management
- **Spender.Analytics** - Analytics and reporting
- **Spender.Infrastructure** - EF Core DbContext (`SpenderDbContext`) and Migrations

**Dependency Pattern**: All business services reference Spender.Shared. The API references all services.

### Frontend - React + Vite
Located in `frontend/spender-ui/`:
- React 19 + Vite + TypeScript
- React Router v7 for routing, TanStack Query v5 for server state, lucide-react for icons
- Uses pnpm (pnpm-lock.yaml)
- Fully implemented with pages: dashboard, transactions, categories, analytics, debt

### Deployment - Containerized Raspberry Pi
- Dual-architecture Docker setup (API + Frontend containers)
- GitHub Actions CI/CD targeting ARM64 for Raspberry Pi deployment
- Caddy reverse proxy with automatic HTTPS
- PostgreSQL 18 database with external volume mounting

## Development Commands

### Backend (.NET)
```bash
# Build entire solution
dotnet build

# Run API locally
dotnet run --project Spender.API

# Publish for production
dotnet publish Spender.API -c Release -o /app/publish
```

### Frontend
```bash
cd frontend/spender-ui

# Install dependencies
pnpm install

# Development server
pnpm dev

# Production build
pnpm build

# Generate Orval hooks + types (requires API running on :5020)
pnpm generate          # regenerates src/api/ from openapi.json
pnpm generate:fetch    # fetches fresh spec from live API, then generates
```

### Docker Development
```bash
# Build and run all services locally
docker-compose up --build

# Build specific images
docker build -t spender-api .
docker build -t spender-frontend frontend/spender-ui/
```

## Key Configuration Files

### Docker Setup
- `Dockerfile` - Multi-stage .NET API build (targets ARM64)
- `frontend/spender-ui/Dockerfile` - Multi-stage Node.js + nginx frontend
- `docker-compose.yml` - Local orchestration with PostgreSQL
- `Caddyfile` - Reverse proxy configuration using environment variables

### Environment Configuration
- `.env.example` - Template with required variables:
  - `API_IMAGE` / `FRONTEND_IMAGE` - Container registry paths
  - `DB_PASSWORD` - PostgreSQL password
  - `API_DOMAIN` / `APP_DOMAIN` - Caddy routing domains

### CI/CD Pipeline (`.github/workflows/deploy.yml`)
- Builds ARM64 images for Raspberry Pi
- Pushes to GitHub Container Registry (ghcr.io)
- Deploys via SSH to Pi with automatic container restart
- Requires secrets: HOST, PORT, USER, SSH_KEY, DB_PASSWORD
- Requires variables: OWNER, API_DOMAIN, APP_DOMAIN, VITE_API_URL

## Project State
- Full-stack implementation: API endpoints, domain services, and React frontend all in place
- API runs on port 5020 locally (`ASPNETCORE_URLS` in `launchSettings.json`)
- Frontend `VITE_API_URL` defaults to `http://localhost:5020` when env var is unset
- EF Core migrations live in `Spender.Infrastructure/Migrations/`

## API Endpoints

### Transactions
- `GET /api/transactions` - Get all transactions (sorted by date desc)
- `GET /api/transactions/{id}` - Get specific transaction
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/{id}` - Update transaction
- `DELETE /api/transactions/{id}` - Delete transaction

### Categories
- `GET /api/categories` - Get all categories (sorted by name)
- `GET /api/categories/{id}` - Get specific category
- `POST /api/categories` - Create new category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category (if no transactions)

### People
- `GET /api/people` - Get all people (sorted by name)

### Analytics
- `GET /api/analytics/monthly?year=2025&month=3` - Monthly spending summary
- `GET /api/analytics/yearly?year=2025` - Yearly spending breakdown by month
- `GET /api/analytics/debt?perspectiveId=1&from=&to=` - Debt summary from one person's perspective

## Data Models

### Transaction
```json
{
  "id": 1,
  "amount": 25.50,
  "description": "Coffee shop",
  "date": "2025-03-21T00:00:00Z",
  "categoryId": 1,
  "category": { "id": 1, "name": "Food & Dining", "color": "#FF6B6B" },
  "expenseType": 0,
  "paidById": null,
  "fundedById": null
}
```

### ExpenseType Enum
- `0` Personal — single-person expense
- `1` Shared — split between payer and funder
- `2` SharedPrepaidJoint — joint prepayment
- `3` SharedPrepaidByOne — one person prepays for both

### Category
```json
{
  "id": 1,
  "name": "Food & Dining",
  "color": "#FF6B6B",
  "createdAt": "2025-03-21T12:00:00Z"
}
```

### Default Categories
The system seeds 7 default categories: Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, and Other.

## Database
- PostgreSQL with Entity Framework Core
- Database auto-created on startup
- Development connection: `localhost/spender_dev`
- Production connection: configured via docker-compose environment

## Microservices Architecture

This project now follows true microservices patterns with domain-driven design and event-driven communication.

### Spender.Shared (Contracts & Events)
```
Models/
  ├── Category.cs           # Domain entities
  └── Transaction.cs
DTOs/
  ├── MonthlySummary.cs     # Data transfer objects
  ├── CategorySummary.cs
  ├── CreateTransactionRequest.cs
  └── CreateCategoryRequest.cs
Events/
  ├── IDomainEvent.cs       # Event infrastructure
  ├── TransactionEvents.cs  # Transaction domain events
  └── CategoryEvents.cs     # Category domain events
Abstractions/
  └── IDomainService.cs     # Service marker interface
Common/
  └── ApiResponse.cs        # API response wrapper
```

### Spender.Infrastructure (Data Layer)
```
Data/
  └── SpenderDbContext.cs   # EF Core DbContext (Categories, Transactions, People)
Migrations/                 # EF Core database migrations
```

### Spender.API (Gateway/Orchestration)
```
Endpoints/
  ├── TransactionEndpoints.cs  # HTTP route handlers
  ├── CategoryEndpoints.cs
  ├── PeopleEndpoints.cs
  └── AnalyticsEndpoints.cs
Extensions/
  ├── ServiceCollectionExtensions.cs  # DI registration
  ├── WebApplicationExtensions.cs     # App pipeline
  └── ValidationExtensions.cs
```

### Spender.Transactions (Transaction Domain)
```
Services/
  ├── ITransactionService.cs   # Transaction business logic
  └── TransactionService.cs    # Implementation with events
```

### Spender.Categories (Category Domain)
```
Services/
  ├── ICategoryService.cs      # Category business logic
  └── CategoryService.cs       # Implementation with events
```

### Spender.Analytics (Analytics Domain)
```
Services/
  ├── IAnalyticsService.cs     # Read-only analytics
  └── AnalyticsService.cs      # Implementation
EventHandlers/
  └── TransactionEventHandler.cs  # Listens to transaction events
```

## Architecture Patterns

### Domain-Driven Design (DDD)
- Each microservice owns its domain logic
- Domain events for decoupled communication
- Shared kernel (Spender.Shared) for contracts
- Aggregate boundaries respected

### Event-Driven Architecture
- Domain events published on state changes
- Loose coupling between services via MediatR
- Analytics service subscribes to transaction events
- Audit trail and eventual consistency

### CQRS (Command Query Responsibility Segregation)
- Write operations in domain services (Transactions, Categories)
- Read operations optimized in Analytics service
- Events enable read model updates

### Microservices Patterns
- **API Gateway**: Spender.API orchestrates calls
- **Shared Database**: Single DB with domain boundaries
- **Event Sourcing Ready**: Domain events infrastructure in place
- **Service Registry**: Dependency injection container

## Event Flow Example
```
1. User creates transaction via API
2. TransactionService.CreateTransactionAsync()
3. Publishes TransactionCreatedEvent
4. AnalyticsEventHandler receives event
5. Analytics cache invalidated/updated
6. Response returned to user
```

## Benefits of This Architecture

### Scalability
- Each domain can be independently deployed
- Event-driven allows async processing
- Easy to extract to separate deployments

### Maintainability
- Clear domain boundaries
- Domain logic isolated in services
- Events provide loose coupling

### Testability
- Each service can be unit tested in isolation
- Event handlers can be tested independently
- Mock dependencies easily via interfaces

### Extensibility
- Add new domains without affecting existing ones
- Subscribe to events from any service
- Easy to add caching, messaging, etc.

## Working with this Codebase
- True microservices architecture with proper separation of concerns
- Event-driven communication enables loose coupling and audit trails
- Domain services handle business logic with proper validation
- API layer is now a thin orchestration layer
- Ready to scale: can easily move services to separate deployments
- Frontend needs complete rebuild from the default Vite template
- Production-ready with Docker deployment infrastructure