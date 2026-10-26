# Smart QR Attendance Management System

A simple full-stack academic prototype using React/Vite, Express, MongoDB/Mongoose, JWT, bcrypt, and single-use QR tokens. It uses real API calls and MongoDB records; there are no mock attendance records.

## Prerequisites

- Node.js 18 or newer and npm
- MongoDB 6+ running locally, or a MongoDB Atlas connection string
- A modern browser with camera permission support for scanning

## Setup

1. Install the root helper and both application dependencies:

   ```powershell
   npm install
   npm run install:all
   ```

2. Copy `server/.env.example` to `server/.env`, then set `MONGODB_URI` and a long `JWT_SECRET`. Copy `client/.env.example` to `client/.env`. The root `.env` created for this workspace is also usable as a reference, but server and client environment files are the least ambiguous setup.

3. Start MongoDB. For a local install, the default URI is `mongodb://127.0.0.1:27017/qr_attendance`. For Atlas, use the `mongodb+srv://...` connection string and allow your development IP.

4. Seed a teacher account:

   ```powershell
   npm run seed:teacher --prefix server -- "Demo Teacher" teacher@example.com teacher123
   ```

5. In separate terminals, start the API and frontend:

   ```powershell
   npm run dev --prefix server
   npm run dev --prefix client
   ```

   Open `http://localhost:5173`.

## Using the prototype

1. Log in with the seeded teacher account.
2. Create a session with a subject and class name, then open it and choose **Start attendance**.
3. A backend-generated QR payload appears. Its random token expires after 60 seconds; use **Refresh QR** when needed.
4. Register a student account in another browser/device, log in, choose **Scan attendance**, allow the camera, and scan the teacher QR.
5. A successful scan creates an `AttendanceRecord`, consumes the QR token, and rotates the token. The teacher display polls the backend and updates the attendance count and QR.
6. Teachers can inspect session records and export the reports table to CSV. Students can view their history and summary.

MongoDB stores users, sessions, and attendance records. The compound unique index on `sessionId` and `studentId` prevents duplicate records.

## API overview

- `POST /api/auth/register` — public student registration
- `POST /api/auth/login` — obtain JWT
- `GET /api/auth/me` — authenticated profile
- `POST /api/sessions` — teacher creates a session
- `GET /api/sessions` and `GET /api/sessions/:id` — authorized session access
- `POST /api/sessions/:id/start`, `/refresh-qr`, `/end` — teacher controls
- `GET /api/sessions/:id/current-qr` — teacher's current QR token
- `GET /api/sessions/:id/attendance` — teacher records
- `POST /api/attendance/scan` — authenticated student scan
- `GET /api/attendance/my` and `/summary` — student history/statistics
- `GET /api/attendance/reports` — teacher report data

All responses use `{ success, message?, data? }`. Password hashes, JWT secrets, and QR token hashes are never sent to clients.

## QR security and local MongoDB limitation

QR tokens are created with `crypto.randomBytes`, stored as SHA-256 hashes, and expire after 60 seconds. A conditional `findOneAndUpdate` checks the active session, hash, and expiry before replacing the hash. The attendance record has a unique compound index. The server first attempts a MongoDB transaction; if MongoDB is a standalone local server without replica-set transactions, it falls back to the atomic claim plus unique-index path. In that fallback, a duplicate request can receive a conflict after the token claim, but it cannot create a duplicate record or successfully reuse the token. The live raw token is kept only in process memory for the teacher display and is never persisted.

## Common errors

- **MongoDB connection refused:** start MongoDB or replace `MONGODB_URI` with a reachable Atlas URI.
- **CORS/network error:** confirm the API is on port 5000 and `CLIENT_URL` matches the Vite URL.
- **Camera cannot start:** use `localhost` or HTTPS, allow camera permission, and close other camera apps.
- **Expired QR:** refresh the teacher QR and scan the replacement.
- **Duplicate attendance:** each student can attend a given session only once.
