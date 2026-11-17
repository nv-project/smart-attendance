# Smart Attendance and Timetable System (MERN)

QR-based attendance plus a timetable that refuses clashing lectures.

## Roles
| Role | Can do |
|---|---|
| Admin | Add/delete courses, build the timetable (clash-checked) |
| Teacher | Start an attendance session (rotating QR), see who is present live, view and download reports |
| Student | Scan the QR (or type the code), see attendance % per course, get a warning under 75% |

## Key ideas (good for viva)
- **Timetable clash check** (`server/routes/timetable.js`): same day + overlapping time + same teacher, room or batch = rejected, with the reason shown.
- **Rotating QR** (`server/routes/sessions.js`): the code changes every 15 s; the previous code is accepted for 10 s more. A photo of the QR sent to a friend stops working almost immediately.
- **No duplicate attendance**: unique index on (session, student) in MongoDB.
- **JWT auth + role middleware**: `protect` and `allow('teacher')` guard every route.

## Run locally
1. Install Node 18+ and MongoDB (or a free MongoDB Atlas cluster).
2. Backend:
   ```
   cd server
   cp .env.example .env      # edit MONGO_URI and JWT_SECRET
   npm install
   npm run seed              # demo users + courses
   npm run dev
   ```
3. Frontend (new terminal):
   ```
   cd client
   npm install
   npm run dev
   ```
4. Open http://localhost:5173

Demo logins (password `password123`): `admin@college.edu`, `teacher@college.edu`, `riya@college.edu` (batch MCA-1-A).

Try it: sign in as admin, add a timetable slot, then add an overlapping one in the same room to see the clash message. Sign in as the teacher in one browser and the student in another (or on your phone) to test the QR flow.

## Deploy (free, one service)
The server also serves the built React app in production, so you deploy once.
1. **Database**: create a free cluster on MongoDB Atlas, add a database user, allow access from anywhere (0.0.0.0/0), copy the connection string.
2. Push this folder to a GitHub repo.
3. **Render** → New Web Service → pick the repo:
   - Build command: `npm run build`
   - Start command: `npm start`
   - Environment: `NODE_ENV=production`, `MONGO_URI=<atlas string>`, `JWT_SECRET=<long random string>`
4. Open the Render URL. It is HTTPS, which phone cameras need for QR scanning.
5. Create the admin once: run `npm run seed` locally with `MONGO_URI` pointing at Atlas (this wipes users and courses, so do it only on a fresh database).

## API summary
| Method | Route | Who |
|---|---|---|
| POST | /api/auth/register, /login | public |
| GET | /api/auth/me | any |
| GET/POST/DELETE | /api/courses | admin writes, all read their own |
| GET/POST/DELETE | /api/timetable | admin writes, all read their own |
| POST | /api/sessions/start, /:id/refresh, /:id/end | teacher |
| GET | /api/sessions/:id | teacher (live present list) |
| POST | /api/attendance/mark | student |
| GET | /api/attendance/my | student |
| GET | /api/attendance/course/:id (+ /csv) | teacher |

## Ideas to extend
Geofencing (reject scans far from the classroom), per-lecture absent list, email alerts below 75%, free-room suggestions, an admin screen to edit users and batches.
