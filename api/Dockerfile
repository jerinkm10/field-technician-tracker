FROM node:20-alpine AS build

WORKDIR /usr/src/api

COPY package.json package-lock.json ./
RUN npm ci

COPY nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/field_technician_tracker?schema=public npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /usr/src/api
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY --from=build /usr/src/api/node_modules ./node_modules
COPY --from=build /usr/src/api/dist ./dist

EXPOSE 3007

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
