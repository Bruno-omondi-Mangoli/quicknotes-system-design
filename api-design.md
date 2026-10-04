# QuickNotes API Design

This is the REST API the backend team should build for the real QuickNotes service. It uses HTTPS and JSON. Resources are plural nouns (`/notes`), the HTTP method says what to do, and the API is stateless: every request except login carries `Authorization: Bearer <token>`, and the server returns only the logged-in user's notes.

Base URL: `https://api.quicknotes.com`

## Endpoints

| Method | Path | Description | Success status |
| --- | --- | --- | --- |
| POST | /auth/login | Log in with email and password and receive a token | 200 OK |
| GET | /notes | List the logged-in user's notes. Optional query parameters: `category`, `search` | 200 OK |
| GET | /notes/{id} | Get one note | 200 OK |
| POST | /notes | Create a note | 201 Created |
| PATCH | /notes/{id} | Update part of a note (for example only its text) | 200 OK |
| DELETE | /notes/{id} | Delete a note | 204 No Content |
| POST | /notes/{id}/tags | Attach a tag to a note | 201 Created |
| DELETE | /notes/{id}/tags/{tagId} | Remove a tag from a note | 204 No Content |

Example of query parameters: `GET /notes?category=work&search=report`

## Example: create a note

Request: `POST /notes`

```http
POST /notes HTTP/1.1
Host: api.quicknotes.com
Content-Type: application/json
Authorization: Bearer abc123
```

```json
{
  "text": "Finish the project report",
  "category": "work",
  "tags": ["urgent"]
}
```

Response: `201 Created`

```json
{
  "id": 42,
  "text": "Finish the project report",
  "category": "work",
  "tags": ["urgent"],
  "createdAt": "2026-09-22T09:15:00Z"
}
```

## Example: list notes

Request: `GET /notes?category=study` with the header `Authorization: Bearer abc123`

Response: `200 OK`

```json
[
  {
    "id": 7,
    "text": "Revise HTTP methods",
    "category": "study",
    "tags": ["exams"],
    "createdAt": "2026-09-20T18:30:00Z"
  },
  {
    "id": 9,
    "text": "Practise SQL joins",
    "category": "study",
    "tags": [],
    "createdAt": "2026-09-21T08:05:00Z"
  }
]
```

## Error status codes

| Status | When it happens | Example message |
| --- | --- | --- |
| 400 Bad Request | The request is invalid, such as an empty note or a note over 200 characters | Note text must be 1-200 characters. |
| 401 Unauthorized | The user is not logged in, or the token is missing or invalid | Missing or invalid token. |
| 403 Forbidden | The user is logged in but not allowed, such as deleting someone else's note | You do not have permission to delete this note. |
| 404 Not Found | The note or URL does not exist | Note 999 was not found. |
| 500 Internal Server Error | Something broke on the server | Something went wrong. Please try again later. |

Every error uses the same JSON body. Example for `POST /notes` with an empty text, status `400 Bad Request`:

```json
{
  "error": {
    "status": 400,
    "message": "Note text must be 1-200 characters."
  }
}
```
