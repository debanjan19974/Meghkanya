# Meghkanya AWS Deployment Guide

Recommended production setup in AWS Mumbai (`ap-south-1`):

- Frontend: AWS Amplify Hosting
- Backend: AWS App Runner
- Database: Amazon RDS PostgreSQL

This path does not require Docker to run on your laptop. App Runner builds and runs the backend from your Git repository using `apprunner.yaml`.

## 1. Prepare The Repository

Push this project to GitHub or Bitbucket.

Important deployment files:

- `apprunner.yaml` - backend App Runner build/run config
- `amplify.yml` - frontend Amplify monorepo build config
- `requirements.txt` - backend Python dependencies
- `frontend/package.json` - frontend dependencies

Do not commit `.env`.

## 2. Create RDS PostgreSQL

Create an Amazon RDS PostgreSQL database:

- Region: `ap-south-1`
- DB name: `meghkanya_saree_retail`
- Engine: PostgreSQL
- Public access: Prefer `No` for production
- VPC: Same VPC you will connect App Runner to

Create the production database URL:

```text
postgresql+psycopg2://USERNAME:PASSWORD@RDS-ENDPOINT:5432/meghkanya_saree_retail
```

Security group rule:

- Allow PostgreSQL port `5432` from the App Runner VPC connector/security group only.

## 3. Deploy Backend With App Runner

In AWS App Runner:

1. Create service
2. Source: GitHub or Bitbucket repository
3. Source directory: repository root
4. Configuration file: use `apprunner.yaml`
5. Port: `8000`

Set runtime environment variables:

```text
APP_NAME=Meghkanya API
APP_ENV=production
SECRET_KEY=<long-random-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=120
DATABASE_URL=<your-rds-postgresql-url>
CORS_ORIGINS=<your-amplify-url>
BOOTSTRAP_ADMIN_ENABLED=true
BOOTSTRAP_ADMIN_USERNAME=<your-admin-username>
BOOTSTRAP_ADMIN_PASSWORD=<your-temporary-admin-password>
BOOTSTRAP_ADMIN_FULL_NAME=<admin-name>
```

If your RDS database is private, attach an App Runner VPC connector that can reach the RDS subnet/security group.

After deployment, open:

```text
https://<your-app-runner-url>/health
```

It should return:

```json
{"status":"ok"}
```

After the first successful admin login, update App Runner:

```text
BOOTSTRAP_ADMIN_ENABLED=false
```

## 4. Deploy Frontend With Amplify

In AWS Amplify Hosting:

1. Create new app
2. Connect the same Git repository
3. Set app root / monorepo root to `frontend`
4. Use the root `amplify.yml`
5. Add this environment variable:

```text
VITE_API_BASE_URL=https://<your-app-runner-url>/api
```

Deploy the frontend.

Copy the Amplify domain, for example:

```text
https://main.xxxxx.amplifyapp.com
```

Then update the App Runner backend environment variable:

```text
CORS_ORIGINS=https://main.xxxxx.amplifyapp.com
```

Redeploy/restart App Runner after changing CORS.

## 5. Login

Open the Amplify frontend URL and log in with the bootstrap admin credentials you configured in App Runner.

For production, do not use the local defaults:

```text
admin / admin123
```

## 6. Optional Domain Setup

Recommended:

- `www.yourdomain.com` -> Amplify frontend
- `api.yourdomain.com` -> App Runner custom domain

Use AWS Certificate Manager managed HTTPS certificates.

Then set:

```text
VITE_API_BASE_URL=https://api.yourdomain.com/api
CORS_ORIGINS=https://www.yourdomain.com
```

## 7. Docker/ECS Alternative

The included `Dockerfile` can also be used with:

- Amazon ECR
- Amazon ECS Fargate
- Application Load Balancer

Use this route later if you need more control over networking, scaling, or container images. For the first AWS launch, App Runner is simpler.

## 8. Final Checklist

- Backend `/health` works
- RDS database tables are created on first backend startup
- Amplify frontend loads
- Login works
- CORS includes only real frontend domains
- `BOOTSTRAP_ADMIN_ENABLED=false` after first login
- RDS automated backups are enabled
- `.env` is not committed
