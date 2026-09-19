# GradeFair

Fair, transparent credit for team project contributions. Managers create projects and assign weighted tasks; members complete work and rate each other; everyone sees a leaderboard whose every point is explained.

**Stack:** MongoDB · Express 5 · React 19 · Node 20+ (MERN)

## Quick start

```bash
# 1. Backend
cd backend
cp .env.example .env        # then edit MONGO_URI / JWT_SECRET
npm install
npm run seed                # optional: demo data (wipes the database!)
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm start                   # http://localhost:3000
```

Demo accounts after `npm run seed` (password for all: `Password123`):

| Role    | Email                    |
| ------- | ------------------------ |
| Admin   | admin@gradefair.local    |
| Manager | priya@gradefair.local    |
| Manager | rahul@gradefair.local    |
| Member  | ananya@gradefair.local   |
| Member  | arjun@gradefair.local    |
| Member  | sneha@gradefair.local    |

To create an admin on an existing database: `npm run create-admin -- you@example.com YourPassword`.

## How scoring works

Scores are recomputed live from the data — nothing is stored or hand-editable.

| Component         | Rule                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------- |
| **Task points**   | Each *completed* task earns `size × 10` (small 10, medium 20, large 30). Open tasks earn 0. |
| **Timeliness**    | +5 finished on/before deadline · −3 finished late · −2 per open task currently overdue    |
| **Peer feedback** | Average teammate rating (1–5) × 4, max 20 per project                                    |
| **Activity**      | +1 per status change / description edit by the assignee, capped at 10                    |

Formula constants live in `backend/utils/score.js` and are exposed at `GET /api/score/weights` so the UI can explain them.

## Roles

| Role        | Can do                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------- |
| **Member**  | See own projects/tasks, move tasks through To do → In progress → Done, rate teammates, view leaderboard |
| **Manager** | Create/edit/archive/delete their projects, manage members, create/edit/delete/reassign tasks, read all feedback with comments |
| **Admin**   | Everything, plus user management (create, change role, reset password, delete)          |

## API overview

All routes are under `/api` and need `Authorization: Bearer <token>` except `auth/register` and `auth/login`.

| Area      | Endpoints                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| Auth      | `POST auth/register` · `POST auth/login` · `GET auth/me`                                                   |
| Users     | `GET users` · `GET users/me/stats` · `PUT users/me` · `PUT users/me/password`                              |
| Projects  | `GET/POST projects` · `GET/PUT/DELETE projects/:id` · `GET projects/:id/tasks` · `GET projects/:id/summary` · `POST projects/:id/members` · `DELETE projects/:id/members/:userId` |
| Tasks     | `GET/POST tasks` · `GET/PUT/DELETE tasks/:id` · `PATCH tasks/:id/status` · `PUT tasks/:id/complete`       |
| Feedback  | `POST feedback` · `GET feedback/me/received` · `GET feedback/me/given` · `GET feedback/project/:id` · `DELETE feedback/:id` |
| Scores    | `GET score/project` · `GET score/project/:id` · `GET score/overall` · `GET score/me` · `GET score/weights` |
| Activity  | `GET activity?page=&limit=&action=` · `GET activity/me` · `GET activity/project/:id`                       |
| Admin     | `GET admin/stats` · `GET/POST admin/users` · `PUT admin/users/:id/role` · `PUT admin/users/:id/password` · `DELETE admin/users/:id` · `GET admin/projects` |
| Health    | `GET health`                                                                                               |

## Environment variables

**backend/.env**

| Var              | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `PORT`           | API port (default 5000)                               |
| `MONGO_URI`      | MongoDB connection string                             |
| `JWT_SECRET`     | Long random string used to sign tokens                |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d`                             |
| `CLIENT_URL`     | Comma-separated allowed origins (empty = allow all)   |

**frontend/.env** (optional)

| Var                 | Description                                        |
| ------------------- | -------------------------------------------------- |
| `REACT_APP_API_URL` | API base URL (default `http://localhost:5000/api`) |

## Project layout

```
backend/
  server.js            express app, CORS, error handling
  middleware/auth.js   JWT auth, requireRole(), validateId()
  models/              User, Project, Task, Feedback, ActivityLog
  routes/              auth, user, project, task, feedback, score, activity, admin
  utils/score.js       the scoring engine
  seed.js              demo data
frontend/src/
  context/             AuthContext, ThemeContext (light/dark)
  components/ui/       design-system primitives (Modal, Badge, Avatar, StarRating, …)
  components/          TaskItem, TaskBoard (kanban), form modals, ScoreChart, ActivityFeed
  pages/               Login, Signup, Dashboard, Projects, ProjectDetails, Tasks, Leaderboard,
                       Feedback, Activity, Profile, Admin
  styles/global.css    design tokens + all styling
```
