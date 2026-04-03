# API Reference

Base URL: `http://localhost:3000/api`

All request/response bodies are JSON. Protected endpoints require `Authorization: Bearer <token>` header.

## Authentication

### Login

```
POST /api/admins/login
```

**Body:**
```json
{
  "email": "admin@mevyn.com",
  "password": "changeme123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOi..."
}
```

Token expires per `JWT_EXPIRES_IN` (default 7 days).

---

## Blog Posts

### List published posts

```
GET /api/posts?page=1&limit=20&tag=tech&series=getting-started
```

All query params are optional. Returns only published, non-deleted posts. Filter by `tag` or `series`. If a post has `anonymous: true`, the `authors` field is returned as an empty array.

**Response:**
```json
{
  "data": [
    {
      "uuid": "...",
      "title": "My Post",
      "slug": "my-post",
      "authors": [{ "uuid": "...", "name": "Jane" }],
      "anonymous": false,
      "excerpt": "A short summary",
      "cover_image": "https://...",
      "tags": ["tech"],
      "series": "getting-started",
      "published_at": "2024-01-01T00:00:00.000Z",
      "status": "published",
      "body_html": "<p>Content...</p>",
      "content_blocks": []
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### Get single post

```
GET /api/posts/:identifier
```

`:identifier` can be a slug or uuid. Returns published posts only.

### Create post (auth required)

```
POST /api/posts
```

**Body:**
```json
{
  "title": "My New Post",
  "body_html": "<p>Hello world</p>",
  "authors": [{ "uuid": "...", "name": "Jane" }],
  "anonymous": false,
  "excerpt": "A brief summary",
  "cover_image": "https://...",
  "tags": ["tech", "news"],
  "series": "getting-started",
  "content_blocks": [],
  "status": "draft"
}
```

Only `title` is required. Defaults to `draft` status. If `authors` is omitted, defaults to the authenticated admin. `series` is an optional string indicating which series the post belongs to (max 200 chars).

### Update post (auth required)

```
PUT /api/posts/:uuid
```

Send only the fields you want to update. Changing the title auto-generates a new slug.

### Soft delete post (auth required)

```
DELETE /api/posts/:uuid
```

Sets `deleted_at` timestamp. Post disappears from public listings but remains in the database.

### Restore post (auth required)

```
PATCH /api/posts/:uuid/restore
```

Clears `deleted_at`, making the post visible again.

### List all posts — admin view (auth required)

```
GET /api/posts/drafts/all?page=1&limit=20&status=draft&deleted=false
```

Returns all posts including drafts and internal metadata. Filter with:
- `status`: `draft` or `published`
- `deleted`: `true` (only deleted), `all` (everything), omit for active only

---

## Events

### List events

```
GET /api/events?page=1&limit=20&status=upcoming
```

Returns non-deleted events sorted by date ascending.

### Get single event

```
GET /api/events/:identifier
```

`:identifier` can be a slug or uuid.

### Create event (auth required)

```
POST /api/events
```

**Body:**
```json
{
  "title": "Annual Conference",
  "description": "<p>Join us for...</p>",
  "date": "2024-06-15T09:00:00.000Z",
  "end_date": "2024-06-15T17:00:00.000Z",
  "location": {
    "name": "Convention Center",
    "address": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "country": "US"
  },
  "cover_image": "https://...",
  "registration_url": "https://...",
  "is_virtual": false,
  "status": "upcoming"
}
```

`title` and `date` are required.

### Update event (auth required)

```
PUT /api/events/:uuid
```

Send only the fields you want to update.

### Soft delete event (auth required)

```
DELETE /api/events/:uuid
```

### Restore event (auth required)

```
PATCH /api/events/:uuid/restore
```

---

## Admin Accounts

### Get own profile (auth required)

```
GET /api/admins/me
```

### Change own password (auth required)

```
PUT /api/admins/me/password
```

**Body:**
```json
{
  "current_password": "oldpass",
  "new_password": "newpass"
}
```

### Create admin account (admin role required)

```
POST /api/admins
```

**Body:**
```json
{
  "email": "editor@mevyn.com",
  "password": "securepassword",
  "name": "Jane Editor",
  "role": "editor"
}
```

`role` can be `admin` or `editor`. Editors can manage posts and events. Admins can also manage other accounts.

### List all accounts (admin role required)

```
GET /api/admins
```

### Update account (admin role required)

```
PUT /api/admins/:uuid
```

Allowed fields: `name`, `email`, `role`, `is_active`.

### Deactivate account (admin role required)

```
DELETE /api/admins/:uuid
```

Sets `is_active: false`. Cannot deactivate your own account.

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Description of the error",
    "statusCode": 400
  }
}
```

Validation errors:

```json
{
  "errors": ["title is required", "status must be one of: draft, published"]
}
```

## Pagination

Paginated endpoints accept `page` (default 1) and `limit` (default 20, max 100) query parameters. Response includes:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```
