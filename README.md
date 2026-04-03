# Mevyn Backend

REST API for the Mevyn blog platform. Manages blog posts, upcoming events, and editor/admin accounts.

## Stack

- **Runtime**: Node.js 20
- **Framework**: Express 4
- **Database**: MongoDB 7 (native driver)
- **Auth**: JWT
- **Containerization**: Docker (local testing only)

## Quick Start

### With Docker (recommended for testing)

```bash
docker compose up --build
```

The API runs on `http://localhost:3000`. A seed admin account is created automatically.

### Without Docker

Prerequisites: Node.js 20+, MongoDB 7+ running locally.

```bash
cp .env.template .env    # fill in values
npm install
npm run dev              # nodemon with auto-restart
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `MONGO_URI` | MongoDB connection string | — |
| `DB_NAME` | Database name | — |
| `JWT_SECRET` | Secret for signing tokens | — |
| `JWT_EXPIRES_IN` | Token expiry duration | `7d` |
| `SEED_ADMIN_EMAIL` | Initial admin email | `admin@mevyn.com` |
| `SEED_ADMIN_PASSWORD` | Initial admin password | `changeme123` |

## API Overview

All endpoints are prefixed with `/api`.

### Blog Posts `/api/posts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/posts` | No | List published posts |
| GET | `/api/posts/:identifier` | No | Get post by slug or uuid |
| POST | `/api/posts` | Yes | Create post |
| PUT | `/api/posts/:uuid` | Yes | Update post |
| DELETE | `/api/posts/:uuid` | Yes | Soft delete post |
| PATCH | `/api/posts/:uuid/restore` | Yes | Restore deleted post |
| GET | `/api/posts/drafts/all` | Yes | Admin view: all posts |

### Events `/api/events`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/events` | No | List events |
| GET | `/api/events/:identifier` | No | Get event by slug or uuid |
| POST | `/api/events` | Yes | Create event |
| PUT | `/api/events/:uuid` | Yes | Update event |
| DELETE | `/api/events/:uuid` | Yes | Soft delete event |
| PATCH | `/api/events/:uuid/restore` | Yes | Restore deleted event |

### Admins `/api/admins`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admins/login` | No | Login, returns JWT |
| GET | `/api/admins/me` | Yes | Own profile |
| PUT | `/api/admins/me/password` | Yes | Change own password |
| POST | `/api/admins` | Admin | Create account |
| GET | `/api/admins` | Admin | List all accounts |
| PUT | `/api/admins/:uuid` | Admin | Update account |
| DELETE | `/api/admins/:uuid` | Admin | Deactivate account |

## Project Structure

```
server.js                         Entry point
src/
  config/db.js                    MongoDB connection
  middleware/
    auth.js                       JWT auth + role guard
    errorHandler.js               Centralized error handling
    validate.js                   Request validation
  routes/
    posts.js, events.js, admins.js
  controllers/
    postsController.js, eventsController.js, adminsController.js
  helpers/
    collections.js                Collection constants + indexes
docs/                             Developer documentation
```

## Documentation

See [`docs/`](docs/) for detailed guides:

- [Onboarding](docs/onboarding.md) — Getting started for new developers
- [API Reference](docs/api-reference.md) — Full endpoint documentation
- [Docker Guide](docs/docker-guide.md) — Local testing with Docker
