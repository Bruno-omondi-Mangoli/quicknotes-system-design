# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This project has two halves: a small API client that proves a front end can talk to an API (using the free JSONPlaceholder practice API), and three design documents that the backend team can build from.

## Features of the API client

- Load 10 notes from the server (GET) with loading, success, error and empty states
- Create a note (POST) with validation: a title is required and can have at most 100 characters
- Delete a note (DELETE)
- Buttons are disabled while a request is running
- All user text is inserted with `textContent`

Note: JSONPlaceholder is a fake API, so notes you create or delete are not really saved on the server.

## How to run the API client

1. Clone the repository: `git clone https://github.com/Bruno-omondi-Mangoli/quicknotes-system-design.git`
2. Open the folder in VS Code.
3. Right-click `index.html` and choose **Open with Live Server** (or double-click `index.html`).
4. You need an internet connection. Click **Load notes**, create a note with the form, and delete notes with their Delete buttons.

## Design documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I learned

- How `fetch()` with `async` / `await` and `try` / `catch` / `finally` sends GET, POST and DELETE requests, and why I must check `response.ok` myself.
- How to show loading, success, error and empty states and disable buttons while a request runs.
- How to design a RESTful API with plural nouns, the right HTTP methods, status codes and a standard error body.
- How to model data with tables, primary keys, foreign keys and a join table for a many-to-many relationship, and why an index on `user_id` speeds up reads.
- How to estimate load (reads and writes per second, storage per year) and use a CDN, load balancer, cache, read replica and queue to scale, while avoiding single points of failure.
