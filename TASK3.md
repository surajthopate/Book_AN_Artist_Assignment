# Task 3

## Task A — Leaderboard query

```sql
SELECT
  a.name AS artist_name,
  a.category,
  ROUND(AVG(r.score), 2) AS average_score,
  COUNT(r.id) AS total_review_count,
  cb.completed_booking_count AS total_completed_booking_count
FROM artists a
JOIN reviews r
  ON r.artist_id = a.id
JOIN (
  SELECT
    artist_id,
    COUNT(*) AS completed_booking_count
  FROM bookings
  WHERE status = 'completed'
    AND event_end >= NOW() - INTERVAL 90 DAY
  GROUP BY artist_id
) cb
  ON cb.artist_id = a.id
WHERE r.created_at >= NOW() - INTERVAL 90 DAY
  AND r.booking_id IN (
    SELECT id
    FROM bookings
    WHERE status = 'completed'
      AND event_end >= NOW() - INTERVAL 90 DAY
  )
GROUP BY a.id, a.name, a.category, cb.completed_booking_count
HAVING COUNT(r.id) >= 5
ORDER BY average_score DESC, cb.completed_booking_count DESC
LIMIT 10;
```

### Indexes to add
- `CREATE INDEX idx_reviews_artist_created_at ON reviews (artist_id, created_at, score);`
  This supports filtering to the last 90 days and grouping by artist while keeping score retrieval compact.
- `CREATE INDEX idx_bookings_status_end_artist ON bookings (status, event_end, artist_id);`
  This speeds up the completed-booking filter and the join used for the leaderboard.
- `CREATE INDEX idx_bookings_artist_status_time ON bookings (artist_id, status, event_end);`
  This helps when checking overlap and when aggregating completed bookings per artist.

These are the most important because the query is dominated by date-range filtering, grouping, and joins between `reviews` and `bookings`.

### Very large scale approach
At tens of millions of rows, I would avoid running this query on every request by materializing a daily or hourly leaderboard summary table (for example, `artist_review_leaderboard_snapshot`) that stores the computed aggregates for the last 90-day window. The service would refresh this table on a scheduled job or via an event-driven pipeline, and the API would read the precomputed results instead of recalculating them live. The trade-off is slightly stale data and extra storage/maintenance, but it keeps reads fast and predictable under heavy traffic.

## Task B — Schema audit

### 1. Missing foreign keys on relational IDs
Problem: `bookings.artist_id`, `bookings.client_id`, `reviews.booking_id`, and `reviews.artist_id` are bare integers without foreign key constraints.
Why it matters: Orphaned rows and invalid references can silently appear, which breaks analytics and booking integrity.
SQL fix:
```sql
ALTER TABLE bookings
  ADD CONSTRAINT fk_bookings_artist FOREIGN KEY (artist_id) REFERENCES artists(id),
  ADD CONSTRAINT fk_bookings_client FOREIGN KEY (client_id) REFERENCES clients(id);

ALTER TABLE reviews
  ADD CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  ADD CONSTRAINT fk_reviews_artist FOREIGN KEY (artist_id) REFERENCES artists(id);
```

### 2. Money/rate fields use FLOAT
Problem: `hourly_rate` and `amount` are `FLOAT`.
Why it matters: Floating-point values can introduce rounding errors in financial calculations.
SQL fix:
```sql
ALTER TABLE artists
  MODIFY hourly_rate DECIMAL(10,2) NOT NULL;

ALTER TABLE bookings
  MODIFY amount DECIMAL(10,2) NOT NULL;
```

### 3. Status values are free text instead of constrained values
Problem: `bookings.status` is `VARCHAR(50)` with no validation.
Why it matters: Invalid statuses such as `approved` or `done` can corrupt the state machine.
SQL fix:
```sql
ALTER TABLE bookings
  MODIFY status ENUM('pending','confirmed','in_progress','completed','cancelled') NOT NULL;
```

### 4. Missing NOT NULL and defaults on key fields
Problem: `created_at`, `name`, `category`, and booking time fields are nullable or lack defaults.
Why it matters: Null or missing values break filtering, reporting, and business rules.
SQL fix:
```sql
ALTER TABLE artists
  MODIFY name VARCHAR(255) NOT NULL,
  MODIFY category VARCHAR(255) NOT NULL,
  MODIFY created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE bookings
  MODIFY artist_id INT NOT NULL,
  MODIFY client_id INT NOT NULL,
  MODIFY status VARCHAR(50) NOT NULL,
  MODIFY event_start DATETIME NOT NULL,
  MODIFY event_end DATETIME NOT NULL,
  MODIFY created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

### 5. No indexes for the main query paths
Problem: The schema lacks indexes on artist/date and review filters.
Why it matters: Leaderboard, lookups, and overlap checks create slow scans as the dataset grows.
SQL fix:
```sql
CREATE INDEX idx_artists_category ON artists (category);
CREATE INDEX idx_bookings_artist_time ON bookings (artist_id, event_start, event_end, status);
CREATE INDEX idx_reviews_artist_created ON reviews (artist_id, created_at);
```
