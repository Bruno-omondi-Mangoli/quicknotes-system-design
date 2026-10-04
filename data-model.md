# QuickNotes Data Model

QuickNotes stores its lasting data in a relational (SQL) database on the server. The four entities are **users**, **notes**, **tags** and **note_tags**.

## Entities

### users

| Column | Type | Notes |
| --- | --- | --- |
| id | INTEGER | Primary key |
| name | TEXT | NOT NULL |
| email | TEXT | NOT NULL, UNIQUE |
| password_hash | TEXT | NOT NULL (a hash, never the plain password) |
| created_at | TEXT | Default: current time |

### notes

| Column | Type | Notes |
| --- | --- | --- |
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key to users(id), NOT NULL |
| text | TEXT | NOT NULL, at most 200 characters |
| category | TEXT | NOT NULL, default 'personal' |
| created_at | TEXT | Default: current time |

### tags

| Column | Type | Notes |
| --- | --- | --- |
| id | INTEGER | Primary key |
| name | TEXT | NOT NULL, UNIQUE |

### note_tags (join table)

| Column | Type | Notes |
| --- | --- | --- |
| note_id | INTEGER | Foreign key to notes(id) |
| tag_id | INTEGER | Foreign key to tags(id) |

The primary key of note_tags is the pair (note_id, tag_id).

## Relationships

- **One-to-many (users to notes):** one user has many notes, but each note belongs to one user. This is stored with the foreign key `notes.user_id`.
- **Many-to-many (notes and tags):** a note can have many tags, and a tag can be on many notes. A foreign key cannot store this, so the join table `note_tags` holds one row for each note-and-tag pair. Its composite primary key stops the same tag being attached to the same note twice.

## CREATE TABLE statements

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  created_at     TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  text        TEXT NOT NULL CHECK (length(text) <= 200),
  category    TEXT NOT NULL DEFAULT 'personal',
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id  INTEGER NOT NULL,
  tag_id   INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);
```

## Example queries

The `?` marks are placeholders that the server fills in safely (this prevents SQL injection).

```sql
-- 1. GET /notes: all notes of the logged-in user, newest first
SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC;

-- 2. JOIN: this user's notes tagged "urgent"
SELECT notes.text
FROM notes
JOIN note_tags ON note_tags.note_id = notes.id
JOIN tags      ON tags.id = note_tags.tag_id
WHERE tags.name = 'urgent' AND notes.user_id = ?;

-- 3. Number of notes per user (LEFT JOIN keeps users with no notes)
SELECT users.name, COUNT(notes.id) AS note_count
FROM users
LEFT JOIN notes ON notes.user_id = users.id
GROUP BY users.id;

-- 4. POST /notes: create a note
INSERT INTO notes (user_id, text, category) VALUES (?, ?, ?);

-- 5. DELETE /notes/{id}: users can only delete their own notes
DELETE FROM notes WHERE id = ? AND user_id = ?;
```

## Indexes

```sql
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);
```

- **notes(user_id):** almost every request (`GET /notes`, update, delete) filters by the logged-in user. Without the index the database checks every row; with it, it jumps straight to that user's notes. The trade-off is slightly slower writes and extra storage, which is acceptable because QuickNotes is read-heavy.
- **note_tags(tag_id):** this speeds up finding all the notes that have a given tag.

## SQL or NoSQL?

I choose **SQL** (for example PostgreSQL). QuickNotes data is clearly structured, with users, notes and tags that have clear relationships, including a many-to-many one that SQL handles well with a join table and JOINs. The database can enforce the rules itself (unique emails, the 200-character limit, notes that must belong to a user), so the data stays correct even if application code has bugs. The estimated storage of about 180 GB per year fits comfortably in one well-configured database with read replicas. A document database would store notes inside each user's document and duplicate tags, so I would only reconsider it if notes became very flexible (images, checklists, drawings).
