# ChatApp (WeChat-style foundation)

## Run
1. `docker compose up -d`            # MongoDB
2. `cd server && cp .env.example .env && npm i && npm run dev`   # API + Socket.IO on :4000
3. `cd client && npm i && npm run dev`                           # UI on :5173

Register two users in two browser windows, then chat 1:1, create a group, and send images/files.

## Roadmap to production
- Files: move multer disk storage to S3/R2 with presigned uploads + virus scan
- Scale: `@socket.io/redis-adapter`, stateless API behind a load balancer
- Auth: refresh tokens + httpOnly cookies, rate limiting (express-rate-limit), helmet
- Chat features: read receipts, presence, unread counts, message edit/delete, reactions
- Search: Mongo text index -> Elasticsearch/Meilisearch; push notifications (FCM)
- Ops: pino logging, metrics, tests (vitest/supertest), CI, Docker images
