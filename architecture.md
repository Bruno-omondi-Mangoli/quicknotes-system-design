# QuickNotes Architecture

QuickNotes moves from a browser-only app to an online service for 1 million users. This document lists the requirements, estimates the load and describes the architecture.

## 1. Requirements

**Functional requirements**

- Users can register and log in.
- Users can create, read, update and delete their own notes.
- Each note has a category and optional tags.
- Users can search and filter their notes.
- Notes are private: a user can only see their own notes.
- Notes are available on any device the user logs in from.

**Non-functional requirements**

- **Latency:** `GET /notes` should respond in under about 200 ms.
- **Availability:** 99.9% (about 8.8 hours of downtime per year at most), with no single point of failure.
- **Scalability:** handle 1 million users by adding servers, not by rewriting the app.
- **Durability:** saved notes are never lost, thanks to replicas and regular backups.
- **Security:** HTTPS only, token authentication, password hashes, rate limiting.
- **Consistency:** a note list that is one second out of date is acceptable.

## 2. Load estimate for 1 million users

Assumptions: 20% of users are active each day, each active user creates 5 notes and loads their notes 20 times per day, a note is about 500 bytes, a day is about 100,000 seconds and peak traffic is 5x the average.

```text
Daily active users:  1,000,000 x 20%                  = 200,000
Writes:  200,000 x 5 = 1,000,000 per day / 100,000    = about 10 per second (peak about 50)
Reads:   200,000 x 20 = 4,000,000 per day / 100,000   = about 40 per second (peak about 200)
Storage: 1,000,000 notes x 500 bytes = 500 MB per day x 365 = about 180 GB per year
```

The system is **read-heavy** (4 times more reads than writes), so caching and read replicas help a lot. 200 requests per second at peak is manageable for a few ordinary servers, and 180 GB per year fits in one well-configured database.

## 3. Architecture diagram

```text
CLIENT (browser / mobile app)
 |
 |--(1)--> DNS .............. quicknotes.com -> IP addresses
 |--(2)--> CDN --(miss)--> ORIGIN   (index.html, style.css, api.js, images)
 |--(3)--> LOAD BALANCER .... API calls (HTTPS, JSON, token)
               |
               v
         APP SERVER 1 | APP SERVER 2 | APP SERVER 3 ...   (stateless)
               |
               |--(4) reads  --> CACHE (Redis) --(miss)--> READ REPLICA
               |--(5) writes --> PRIMARY DATABASE --(copies rows)--> READ REPLICA
               |--(6) jobs ----> QUEUE --> WORKER --> sends emails, creates exports
```

## 4. What each component does

- **Client:** shows the app to the user and sends HTTP requests to the API, so notes can be used from any device.
- **DNS:** turns quicknotes.com into the IP address of the system so the client can find it.
- **CDN:** serves the static files (HTML, CSS, JavaScript, images) from edge servers near the user, which cuts latency and load on our servers.
- **Load balancer:** spreads requests over the app servers and uses health checks to skip failed ones, so no single server is a bottleneck or a single point of failure.
- **App servers:** run the API code (check the token, validate data, talk to the cache and database) and, being stateless, can be added in numbers to handle more load.
- **Cache (Redis):** keeps each user's note list in memory so most reads are answered in about 1 ms without touching the database.
- **Primary database:** holds the one true copy of the data and accepts all writes.
- **Read replica:** holds a copy of the primary's data and answers the reads that miss the cache, so the primary is not overloaded.
- **Queue:** holds background jobs such as welcome emails and exports so the app server can reply to the user immediately.
- **Worker:** takes jobs from the queue and does the slow work, so a burst of jobs waits in the queue instead of overloading the system.

## 5. Request flows

**GET /notes**

1. The client sends `GET /notes` with the token in the `Authorization` header.
2. The load balancer sends it to a healthy app server.
3. The app server checks the token and finds the user (for example user 1).
4. It looks in the cache for `notes:user:1`.
5. On a cache hit, it returns the cached notes straight away.
6. On a cache miss, it runs `SELECT * FROM notes WHERE user_id = ?` on a read replica, saves the result in the cache with a TTL (for example 5 minutes), and returns it.
7. The response is `200 OK` with the notes as JSON.

**POST /notes**

1. The client sends `POST /notes` with the token and the note as JSON in the body.
2. The load balancer sends it to a healthy app server.
3. The app server checks the token, then validates the data (1-200 characters, a valid category). Invalid data gets `400 Bad Request`.
4. It writes the note to the primary database with `INSERT INTO notes ... VALUES (?, ?, ?)`.
5. It deletes `notes:user:1` from the cache so the next read is fresh.
6. It replies `201 Created` with the new note. The primary copies the row to the read replica a few milliseconds later.
7. If the action needs slow work (for example a welcome email), the app server adds a job to the queue and a worker handles it in the background.

## 6. Trade-offs

- **Speed versus freshness:** the cache and read replicas make reads fast, but data can be briefly stale (cache TTL, replication lag, eventual consistency). We accept this because a note list that is a second out of date does no harm. We reduce it by deleting the user's cache entry whenever they change a note.
- **Simplicity versus scalability:** one server is simple but is a single point of failure and has a limit. Several app servers with a cache, replica and queue scale further but are harder to build and debug. At 200 requests per second at peak, we keep one well-organised application (a monolith) and do not use sharding or microservices yet.
- **Cost versus reliability:** extra app servers, replicas and a CDN cost more money but keep the service online when a part fails.

## 7. Avoiding single points of failure

- **Load balancer:** use a managed or redundant load balancer, with health checks that stop traffic to failed servers.
- **App servers:** run at least two or three identical, stateless servers, so if one crashes the others keep working and no data is lost.
- **Database:** the primary has a read replica, which can be promoted to primary if the primary fails (failover), and the data is backed up regularly.
- **Cache:** if the cache is down, requests fall back to the database (slower but working), and the cache can be replicated.
- **Queue and workers:** run more than one worker, and jobs wait safely in the queue if workers are down.
- **DNS and CDN:** use providers that run on many servers around the world.
