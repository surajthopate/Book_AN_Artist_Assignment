# Local Booking API

This project implements the requested booking API using Node.js + Express, JWT-based authentication, and a local-first architecture designed for the assignment requirements.

## Stack
- MySQL for relational data: users, bookings, and payment records
- MongoDB for document data: artist profiles and reviews
- Node.js + Express backend with JWT auth
- Route/controller/service/model structure to match the requested architecture

## Requirements covered
- Login endpoint with bcrypt password validation and JWT issuance
- Client booking creation with validation and overlap checks
- Booking status transitions with 422 enforcement for invalid state changes
- Artist review endpoint with summary and pagination
- Integration test for an invalid booking transition

## Local setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a local environment file from the sample:
   ```bash
   copy .env.example .env
   ```
   If you are on macOS/Linux, use:
   ```bash
   cp .env.example .env
   ```
4. Update the database values in `.env` with your local MySQL and MongoDB credentials.
5. Make sure MySQL and MongoDB are installed locally and running.
6. Seed local databases:
   ```bash
   npm run seed-db
   ```
7. Start the server:
   ```bash
   npm start
   ```
8. The API runs on `http://localhost:3000` by default.

## Required local services
- MySQL: default connection values come from `.env` and point to `localhost`
- MongoDB: default connection uses `mongodb://127.0.0.1:27017/booking_api`

## Environment
Add the following values to your local `.env` file:
- `PORT` default: `3000`
- `JWT_SECRET` default: `local-dev-secret-key`
- `JWT_EXPIRES_IN` default: `1h`
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- `MONGO_URI`, `MONGO_DB_NAME`

A ready-to-copy template is available in `.env.example`.

## Database architecture
This project uses only local MySQL and MongoDB:
- MySQL for relational data: users, bookings, and payments
- MongoDB for document data: artist profiles and reviews

The application expects both services to be running before startup, and it fails fast if either database is unavailable.

## Implementation notes
- JWT auth is implemented exactly as required, without cookies or server-side sessions.
- The codebase remains organized under `src/routes`, `src/controllers`, `src/services`, and `src/models` to match the requested folder structure.
