# Docker Guide

Docker is used for **local testing only**. Production deployment uses a separate direct deployer.

## Starting

```bash
docker-compose up --build
```

This starts two services:
- **app**: the Node.js API on port 3000
- **mongo**: MongoDB 7 on port 27017

The app waits for mongo to be ready via `depends_on`, then connects, creates indexes, seeds the admin account, and starts listening.

## Rebuilding after code changes

```bash
docker-compose up --build
```

Or to rebuild without cache:

```bash
docker-compose build --no-cache && docker-compose up
```

## Accessing the MongoDB shell

```bash
docker-compose exec mongo mongosh mevyn
```

Useful commands inside `mongosh`:

```javascript
db.posts.find().pretty()
db.events.countDocuments()
db.admins.find({}, { password_hash: 0 })
```

## Resetting the database

Remove the named volume to wipe all data:

```bash
docker-compose down -v
```

Then `docker-compose up --build` starts fresh with a new seed admin.

## Stopping

```bash
docker-compose down        # stop containers, keep data
docker-compose down -v     # stop containers, delete data
```

## Environment overrides

The `docker-compose.yml` has sensible defaults for all env vars. To override, either:

1. Set them in your shell before running docker-compose
2. Create a `.env` file (docker-compose reads it automatically)

Key variables you might override:
- `JWT_SECRET` — use a strong random string
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — customize the initial admin

## Logs

```bash
docker-compose logs app     # API logs
docker-compose logs mongo   # MongoDB logs
docker-compose logs -f      # follow all logs
```
