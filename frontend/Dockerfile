FROM node:20-alpine AS base

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# next.config.ts's rewrites() is baked into a build-time manifest, not re-read at
# `next start` — so BACKEND_ORIGIN must be available as a build arg, not just a
# runtime env var, or the container falls back to its localhost default forever.
ARG BACKEND_ORIGIN=http://backend:8000
ENV BACKEND_ORIGIN=$BACKEND_ORIGIN
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
