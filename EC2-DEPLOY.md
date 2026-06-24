# EC2 Deployment

This repository now has a production Docker setup for a single EC2 instance:

- `web`: Angular admin app served by Nginx
- `api`: NestJS API with Prisma migrations on startup
- `postgres`: PostgreSQL database

The Flutter mobile app is not meant to run as a server process on EC2. Build the APK from your machine or CI and point it to the EC2 API URL.

## 1. Prepare the EC2 instance

Recommended minimum:

- Ubuntu 24.04 LTS
- 1 vCPU / 1 GB RAM (free-tier style)
- Security group ports:
  - `22` for SSH
  - `80` for HTTP
  - `443` later if you add HTTPS

Install Docker and Compose plugin on the server.

## 2. Copy production env file

From the project root:

```bash
cp .env.production.example .env.production
```

Update `.env.production` with real secrets and your EC2 public IP or domain.

Important values:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `APP_GOOGLE_MAPS_API_KEY` if you want the live map page

## 3. Start the production stack

From the project root:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

The admin app will be available at:

```text
http://YOUR_EC2_PUBLIC_IP/
```

The API health endpoint will be available through Nginx at:

```text
http://YOUR_EC2_PUBLIC_IP/api/health
```

## 4. First-time database tasks

If you need seed data after the stack is running:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec api npx prisma db seed
```

## 5. Build the Flutter mobile app for the server URL

From `mobile/`:

```bash
flutter build apk --release --dart-define=API_BASE_URL=http://YOUR_EC2_PUBLIC_IP/api
```

For Android emulator development, the default local value still works:

```text
http://10.0.2.2:3007
```

## 6. Updating the deployment

After code changes:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## Notes

- `docker-compose.yml` remains the local development setup.
- `docker-compose.prod.yml` is the EC2 deployment setup.
- PostgreSQL is kept internal to Docker and is not exposed publicly.
- Socket.IO is proxied through Nginx on `/socket.io`.
- The Angular app talks to the API through `/api`, so the browser does not need a hardcoded server IP.
- For production use on the public internet, add HTTPS in front of this stack before broad rollout.
