# Academic Advising Web App

A web application that helps students plan their courses and book appointments with academic advisors.

## Features
- Authentication with three roles: student, advisor, admin
- Course catalogue with prerequisites (admin: add, edit, delete)
- Students track units (planned / in progress / completed); prerequisites are enforced when adding a course
- Advisors publish weekly availability; students book 30-minute slots with double-booking prevention
- Advisors confirm, complete or cancel appointments
- In-app notifications for booking events
- Admin advisor management
- Row Level Security on every table

## Tech Stack
React, Vite, JavaScript/JSX, CSS, Supabase (PostgreSQL, Auth, RLS), Node.js and npm.

## Project Structure
```
src/
  lib/         Supabase client
  context/     AuthContext (session and profile)
  components/  Layout, ProtectedRoute
  pages/       AuthPage, Dashboard, Courses, MyUnits, Appointments,
               Availability, Advisors, Notifications
```

## Run Locally
```bash
npm install
```
Create a `.env` file:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```
```bash
npm run dev
```
Open http://localhost:5173

## Roles
The application supports three roles:

Student: Manages units, views courses, and books advising appointments.

Advisor: Manages availability and student appointments.

Administrator: Manages courses and advisor access.
