# Mevyn Backend

Node.js + Express REST API with MongoDB. Three resources: blog posts, upcoming events, and admin/editor accounts. Each with full CRUD. Docker for local testing only.

## Stack

- **Runtime**: Node.js 20
- **Framework**: Express 4
- **Database**: MongoDB 7 (native driver, no ORM)
- **Auth**: JWT (jsonwebtoken + bcrypt)
- **Security**: helmet, cors
- **Logging**: Custom multi-level logger (DEBUG, INFO, WARN, ERROR)
- **Config**: dotenv
- **Docker**: local testing only (not production)

## Dev Commands

```bash
npm run dev               # nodemon (auto-restart)
npm start                 # plain node
docker-compose up --build # full stack with MongoDB
```

## Project Structure

```
server.js                         Entry point — mounts routes, middleware, runs startup sequence
Dockerfile                        Node 20 Alpine image for local testing
docker-compose.yml                App + MongoDB 7 containers
src/
  config/
    db.js                         MongoDB connection + getDB()
  middleware/
    auth.js                       authenticate (JWT verify) + requireAdmin (role guard)
    errorHandler.js               AppError class + centralized error-handling middleware
    validate.js                   validate(schema) request body validation factory
  routes/                         One file per resource — only routing declarations
    posts.js                      Blog post endpoints (public + protected)
    events.js                     Event endpoints (public + protected)
    admins.js                     Admin account + auth endpoints
  controllers/                    Business logic + DB operations
    postsController.js            Post CRUD, soft delete, change log, anonymous support
    eventsController.js           Event CRUD, soft delete
    adminsController.js           Login, account CRUD, password change, seed admin
  helpers/
    collections.js                Collection name constants + setupIndexes()
    logger.js                     Multi-level logger with colored output
  startup/
    test.js                       Health checks (DB, indexes, seed admin, routes)
docs/
  onboarding.md                   Getting started for new developers
  api-reference.md                Full endpoint documentation with examples
  docker-guide.md                 Local testing with Docker
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 3000) |
| `MONGO_URI` | MongoDB connection string |
| `DB_NAME` | Database name |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry (default 7d) |
| `SEED_ADMIN_EMAIL` | Initial admin email |
| `SEED_ADMIN_PASSWORD` | Initial admin password |
| `LOG_LEVEL` | Logging threshold: DEBUG, INFO, WARN, ERROR (default DEBUG) |

## API Endpoints

All under `/api`. Public endpoints need no auth. Protected need `Authorization: Bearer <token>`.

### Posts `/api/posts`
- `GET /` — list published (public, paginated, `?tag=`, `?series=`)
- `GET /drafts/all` — list all incl. drafts/deleted (auth)
- `GET /:identifier` — single by slug or uuid (public)
- `POST /` — create (auth, defaults to draft)
- `PUT /:uuid` — update (auth)
- `DELETE /:uuid` — soft delete (auth)
- `PATCH /:uuid/restore` — restore (auth)

### Events `/api/events`
- `GET /` — list events (public, paginated, `?status=`)
- `GET /:identifier` — single by slug or uuid (public)
- `POST /` — create (auth)
- `PUT /:uuid` — update (auth)
- `DELETE /:uuid` — soft delete (auth)
- `PATCH /:uuid/restore` — restore (auth)

### Admins `/api/admins`
- `POST /login` — authenticate, returns JWT (public)
- `GET /me` — own profile (auth)
- `PUT /me/password` — change own password (auth)
- `POST /` — create account (admin only)
- `GET /` — list accounts (admin only)
- `PUT /:uuid` — update account (admin only)
- `DELETE /:uuid` — deactivate account (admin only)

## Conventions

- `getDB()` from `src/config/db.js` provides the connected database instance
- Routes in `src/routes/` — one file per resource, only Express routing
- Controllers in `src/controllers/` — all business logic and DB operations
- Throw `new AppError(statusCode, message)` in controllers for handled errors
- Validation schemas defined inline in route files using `validate()`
- Posts and events use soft delete (`deleted_at` field)
- Admin accounts use `is_active: false` for deactivation
- Blog posts have an optional `series` field (string, max 200 chars) for grouping into a series
- Blog posts track all mutations in `change_log[]`
- Posts with `anonymous: true` hide author identities in public responses
- `authors` is an array on posts (multiple contributors supported)
- Startup sequence: `connectDB() → setupIndexes() → seedAdmin() → listen() → runStartupTests()`
- Use `log` from `src/helpers/logger.js` instead of raw `console.log`
- Log levels: `log.debug()`, `log.info()`, `log.success()`, `log.warn()`, `log.error()`
- Set `LOG_LEVEL` env var to filter output (DEBUG shows everything, ERROR shows only errors)
