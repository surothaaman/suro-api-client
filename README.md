# Suro Node User Management API

A standalone REST API built with Node.js, Express, and SQLite.
Database operations use raw SQL and parameterized queries.

## Setup

Install dependencies:

```powershell
npm ci
```

Start the server:

```powershell
node server.js
```

Base URL: http://127.0.0.1:3000

Stop the server with Ctrl + C. Restart it after editing code.

## Project Files

| File | Purpose |
|---|---|
| server.js | Routes, validation, SQL queries, and error responses |
| database.js | SQLite connection and table initialization |
| package.json | Project metadata and dependencies |
| package-lock.json | Locked dependency versions |
| .gitignore | Excludes local databases, dependencies, and secrets |
| suro.db | Automatically created local SQLite database |

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

The database is created beside database.js.
Records remain saved after the server restarts.
New users receive a UTC creation timestamp.

This project uses its own database, separate from the Python API.

## Endpoints

| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | / | API status message | 200 |
| GET | /api/v1/users | List users | 200 |
| GET | /api/v1/users/:id | Get one user | 200 |
| POST | /api/v1/users | Create a user | 201 |
| PATCH | /api/v1/users/:id | Update selected fields | 200 |
| DELETE | /api/v1/users/:id | Delete a user | 200 |

Replace :id with an actual user ID when sending requests.

## Request Examples

POST /api/v1/users:

```json
{
  "name": "Suro",
  "email": "suro@example.com"
}
```

PATCH /api/v1/users/1:

```json
{
  "name": "Suro Updated"
}
```

For POST and PATCH, use Content-Type: application/json.

PATCH preserves fields omitted from the request.
GET and DELETE require no request body.

## Validation

- User IDs must be positive safe integers.
- Creation requires name and email.
- Names are trimmed and must contain 1â€“100 JavaScript string code units.
- Emails are trimmed and checked using a basic format pattern.
- Unexpected fields are rejected.
- PATCH rejects empty objects and explicit null values.
- Duplicate emails are rejected by SQLite's UNIQUE constraint.

Email validation does not verify mailbox ownership.
The current schema does not enforce case-insensitive email uniqueness.

## Error Responses

| Status | Meaning |
|---|---|
| 400 | Malformed JSON |
| 404 | User or route not found |
| 409 | Email already exists |
| 413 | Request body too large |
| 422 | Invalid fields or user ID |
| 500 | Database or unexpected server error |

Errors return JSON containing a detail field.
Internal error information is logged to the server terminal.

## SQL Injection Prevention

User values are passed separately from SQL through ? placeholders.

```javascript
db.get(
  "SELECT id, name, email, created_at FROM users WHERE id = ?",
  [userId],
  callback
);
```

PATCH builds column assignments only from fixed, allowed column names.
User input is never inserted directly into the SQL string.

## Postman Test Checklist

- Create a temporary user and record its ID.
- Retrieve all users and retrieve the temporary user by ID.
- Update only the name and confirm the email stays unchanged.
- Update the email.
- Restart the server and confirm the user remains saved.
- Delete the temporary user.
- Retrieve or delete that ID again and expect 404.
- Submit invalid fields and expect 422.
- Submit a duplicate email and expect 409.

## Python and Node.js Comparison

| Area | Python API | Node.js API |
|---|---|---|
| Framework | FastAPI | Express |
| Database driver | Built-in sqlite3 | npm sqlite3 package |
| Routes | Decorators such as @app.get | Calls such as app.get |
| Validation | Pydantic models | Shared validation middleware |
| Email validation | EmailStr with email-validator | Basic regular expression |
| SQL execution | Synchronous database calls | Callback-based asynchronous calls |
| Result handling | sqlite3.Row converted to dictionaries | JavaScript objects from callbacks |
| API documentation | Generated Swagger /docs | README and Postman requests |
| Local port | 8000 | 3000 |

The Python API uses normal def route handlers, which FastAPI runs in a
thread pool. Its synchronous SQLite calls do not become asynchronous
simply because the framework supports async.

The Node driver performs database work asynchronously and invokes
callbacks when operations finish. A regular function callback is used
with db.run to access this.lastID and this.changes.

Both implementations use raw SQL, parameterized values, database
constraints, and local SQLite files.

## Scope and Limitations

This is a local learning project.

- Authentication and roles are not implemented.
- CORS and frontend integration are follow-up tasks.
- POST and PATCH perform a write followed by a separate read, so a
  concurrent request can change the record before that read completes.
- No automated test suite is included.

## Version Control

Commit source files, package-lock.json, and documentation.
Exclude node_modules, database files, and secrets.
Commit and push completed work daily.
## Related projects

| Repository | Responsibility | Local address |
|---|---|---|
| [Python API](https://github.com/surothaaman/suro-python-api) | FastAPI, Pydantic and SQLite | http://127.0.0.1:8000 |
| [Node API](https://github.com/surothaaman/suro-node-api) | Express and SQLite | http://127.0.0.1:3000 |
| [React client](https://github.com/surothaaman/suro-api-client) | Browser interface for both APIs | http://localhost:5173 |

Each API owns a separate `suro.db`. Switching backends does not transfer users.

## Browser integration status

The source reviewed for this documentation does **not** configure CORS.
Before demonstrating the React client, synchronize the tested local CORS changes into this repository and repeat the browser CRUD flow.
Allow only the development origins `http://localhost:5173` and `http://127.0.0.1:5173`, with GET, POST, PATCH and DELETE and the Content-Type request header.
For Node, include the CORS dependency and its lockfile update.

Postman does not enforce browser CORS, so Postman success alone does not verify frontend integration.
CORS is a browser access policy; it does not replace authentication or server-side validation.

## Demo rehearsal and security checks

These are repeatable manual checks, not a claim that an automated suite has passed.
Use disposable users and record actual results in Postman.

1. Create a user with a fresh email; expect **201** and save the returned ID.
2. List users and retrieve that ID; expect **200**.
3. PATCH only the name; confirm the email and creation timestamp stay unchanged.
4. Restart the API and retrieve the user to demonstrate persistence.
5. Submit a duplicate email; expect **409**.
6. Send a blank name, invalid email, extra field, empty PATCH, and explicit null directly from Postman; expect **422**. This bypasses browser validation and demonstrates server-side checks.
7. Create a disposable user whose name is `O'Connor`, then another whose name is `' OR 1=1 --`, each with a fresh valid email. Both names should be stored literally. Retrieve them and confirm other records are unaffected.
8. Review every SQL call: user values must be supplied separately through `?` placeholders. A successful payload test alone does not prove all queries safe.
9. Delete the disposable users; expect **200**, followed by **404** when retrieving their IDs.

### Schema and SQL talking points

- **PRIMARY KEY:** uniquely identifies a row; IDs can contain gaps.
- **NOT NULL:** prevents missing database values. Application validation also rejects blank names.
- **UNIQUE:** prevents duplicate stored email values; the schema does not make email uniqueness case-insensitive.
- **1NF:** one value per column, with no repeating groups.
- **2NF:** non-key attributes depend on the whole key; this table has a single-column primary key.
- **3NF:** under this project's assumptions, no non-key attribute determines another non-key attribute.
- SQLite has no traditional stored procedures. This project uses application functions and parameterized SQL.

Run these read-only examples against the intended API's database in a SQLite editor:

```sql
SELECT id, name, email FROM users ORDER BY id;
SELECT name, LOWER(email) AS email_lower FROM users;
SELECT * FROM users WHERE email LIKE '%@gmail.com';
SELECT COUNT(*) AS total_users, MIN(id) AS first_id, MAX(id) AS last_id
FROM users;
SELECT AVG(LENGTH(name)) AS average_name_length FROM users;
```

Demonstrate INSERT, UPDATE and DELETE through the API and show the corresponding SQL in the source.

### Git evidence

Run `git log --oneline --date=short --format="%h %ad %s"` and `git status`.
Show the real commit history and pushed source on GitHub. Do not claim daily commits unless the history supports it.
