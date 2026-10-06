## 1) Two likely causes and what to check first

The two most likely causes are a missing or poorly used index on the search query and a query plan that scans too much data. In MySQL, `GET /artists/search` almost certainly becomes expensive if it filters on name/category/ranking fields without a covering index, or if the query joins many rows before narrowing. The first thing I would confirm is the execution plan using `EXPLAIN ANALYZE`, specifically whether the search is doing full table scans and whether the optimizer is using the wrong join order or missing indexes on `artists`, `bookings`, and any text-search columns.

## 2) 48-hour fix

The fastest safe fix is to add targeted indexes on the exact predicates and join keys used by the search, then reduce the result set before expensive operations. For example, an index on the artist search fields and a composite index on the join/filter columns used for matches and sort order can cut CPU dramatically. If a full-text search is involved, I would add a generated column or use a proper full-text index instead of a broad `LIKE '%term%'` pattern. I would also temporarily cap the result size, add caching for hot search terms, and avoid recomputing expensive aggregates on every request.

## 3) Long-term fix

The right long-term solution is a dedicated search layer: either a search index such as Elasticsearch/OpenSearch or a denormalized read model in Redis or a materialized summary table for frequently searched artist records. This lets the API serve a fast, cached, precomputed result set while MySQL focuses on transactional data. The trade-off is added operational complexity and eventual consistency: the search layer must be refreshed asynchronously, and there is a small lag between writes to the source database and the availability of updated search data.
