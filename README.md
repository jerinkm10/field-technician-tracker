# High Cooling Solution

High Cooling Solution is a full-stack application for managing field technicians, jobs, live location tracking, reports, billing workflows, and an admin dashboard.

## Stack

- Backend: NestJS
- Web Admin Dashboard: Angular
- Mobile App: Flutter
- Database: PostgreSQL
- Realtime: Socket.IO
- Map: Google Maps
- Cache / Live tracking support: Redis

## Project Structure

```text
field-technician-tracker/
  api/
  app/
  mobile/
  docker-compose.yml
  README.md
```

## Start Project Containers

From the project root:

```bash
docker-compose up -d
```

## Enter Containers

```bash
docker-compose exec api /bin/sh
docker-compose exec app /bin/sh
docker-compose exec mob /bin/sh
```

## Backend Setup

From the project root:

```bash
cd api
npm install
npx prisma migrate dev
npm run start:dev
```

Backend runs on:

```text
http://localhost:3007
```

If you run the backend from inside Docker, the `api` service is configured to use the Docker Postgres hostname `postgres`.
If you run the backend directly on your local machine, `api/.env` can keep using `localhost`.

## Angular Admin Dashboard Setup

From the project root:

```bash
cd app
npm install
npm start
```

Angular app runs on:

```text
http://localhost:4200
```

## Flutter Mobile Setup

From the project root:

```bash
cd mobile
flutter pub get
flutter run
```

If you are using the Docker Flutter container and need Linux desktop build support, rebuild the `mob` image after dependency changes:

```bash
docker-compose build mob
docker-compose up -d mob
```

For Docker-based Flutter work, use the container mainly for dependency setup and builds:

```bash
docker-compose exec mob /bin/sh
cd /usr/src/mobile
flutter pub get
flutter build linux
```

## Notes

- Flutter emulator/device testing is better from your local machine.
- The Docker Flutter container is useful mainly for setup and build tasks.
- Use the `mob` container when you want a controlled Flutter environment, but prefer local Flutter for daily development and device testing.
- The `mob` container includes Linux desktop build dependencies such as `cmake`, `ninja-build`, `clang`, `pkg-config`, and `libgtk-3-dev`.
- `flutter run -d linux` inside Docker will fail unless the container is connected to a GUI display server.
- For local desktop testing on Windows, prefer running Flutter directly on your machine with `flutter run -d windows`.
