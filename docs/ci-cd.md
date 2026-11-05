# CampusFlow CI/CD

The repository uses GitHub Actions for continuous integration and Railway's GitHub deployment for continuous delivery.

## What runs

- Pull requests targeting `main` install dependencies and build both applications.
- The backend job generates Prisma, runs TypeScript checks, builds NestJS, and runs the storage safety tests.
- Pushes to `main` also build the combined production Docker image from `Dockerfile`.
- After a push, the workflow waits for Railway and verifies the public frontend, manifest, favicon, and API live-health endpoint.

## Release flow

1. Open a pull request into `main`.
2. Wait for the `CampusFlow CI/CD` checks to pass.
3. Merge the pull request.
4. Railway automatically builds and deploys the new `main` revision.
5. The `Verify Railway deployment` job confirms that the deployment is serving traffic.

The workflow does not contain production secrets. Railway variables remain in Railway's Variables section, and GitHub only validates the public deployment after Railway has released it.

## Required deployment settings

Railway should keep the frontend/API service connected to this repository's `main` branch. The backend must continue to expose:

```text
GET /health/live
```

The smoke check currently uses:

```text
https://campusflowlms.xyz
https://schoolmanagement-production-d78b.up.railway.app
```

If either production hostname changes, update the `FRONTEND_URL` and `BACKEND_URL` values in `.github/workflows/ci-cd.yml`.
