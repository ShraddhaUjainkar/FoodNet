Production deployment notes

1. Build & run with Docker Compose (recommended for local staging):

```bash
cp .env.example .env
# Edit .env as needed
docker compose build
docker compose up -d
```

2. Apply Prisma migrations in production environment:

```bash
# from a container or CI step with DATABASE_URL configured
npx prisma migrate deploy --schema=prisma/schema.prisma
```

3. Worker & OCR

- Move OCR to a background worker (recommended). Use Redis + BullMQ to enqueue jobs and run Tesseract workers separately.

4. Monitoring & backups

- Configure backups for Postgres and set up monitoring (Prometheus/Grafana or APM).

5. Cloudinary image storage

- Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env`.
- Uploaded images are tagged `foodnet-temp` and are removed by the retention cleanup job.

6. Upload retention cleanup

- To avoid accumulating uploaded images, run the cleanup script which removes objects older than `UPLOAD_RETENTION_DAYS` (default 30):

```
# run cleanup locally
npm run cleanup:uploads

# set custom retention, e.g. 7 days
UPLOAD_RETENTION_DAYS=7 npm run cleanup:uploads
```

Schedule this in production as a daily cron job or via your orchestrator (e.g., Kubernetes CronJob).
