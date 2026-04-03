# Onboarding Guide

## Prerequisites

- Node.js 20+ (or Docker)
- MongoDB 7+ (or Docker)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd mevyn_backend
npm install
```

### 2. Configure environment

```bash
cp .env.template .env
```

Edit `.env` with your values. For local dev with Docker, the defaults in `docker-compose.yml` handle everything — you only need `.env` for running without Docker.

### 3. Start the server

**With Docker:**
```bash
docker-compose up --build
```

**Without Docker** (requires a local MongoDB instance):
```bash
npm run dev
```

### 4. Seed admin

On first startup, if the `admins` collection is empty, a seed admin is created from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. You'll see it logged in the console.

Default credentials:
- Email: `admin@mevyn.com`
- Password: `changeme123`

**Change these immediately in production.**

### 5. Get a JWT token

```bash
curl -X POST http://localhost:3000/api/admins/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mevyn.com","password":"changeme123"}'
```

Use the returned `token` in subsequent requests:
```
Authorization: Bearer <token>
```

## Project Conventions

- **Routes** in `src/routes/` — one file per resource, only Express routing declarations
- **Controllers** in `src/controllers/` — all business logic and DB operations
- **Middleware** in `src/middleware/` — auth, validation, error handling
- `getDB()` from `src/config/db.js` provides the connected database instance
- Throw `AppError(statusCode, message)` in controllers for handled errors
- Validation schemas are defined inline in route files using `validate()`
- All deletions are soft deletes (`deleted_at` field) except admin deactivation (`is_active`)
- Blog posts track all changes in `change_log[]` for transparency

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run with node |
| `npm run dev` | Run with nodemon (auto-restart on changes) |
