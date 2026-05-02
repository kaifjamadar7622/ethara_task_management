# Deployment Guide: Railway

## Prerequisites

- GitHub repository with this code pushed
- Railway account (https://railway.app)
- SQLite file stored with the app or on a mounted volume

## Step 1: Create a Railway Project

1. Go to https://railway.app/dashboard
2. Click **New Project**
3. Select **GitHub Repo** and authorize Railway to access your repositories
4. Select this repository (`ethara-task-manager`)
5. Railway will auto-detect the `nixpacks.toml` and configure the build

## Step 2: Configure Environment Variables

In your Railway project dashboard:

1. Go to the **Variables** tab
2. Set `SQLITE_PATH=data/ethara.sqlite`
3. Optionally set `NODE_ENV=production`
4. Click **Save**

## Step 3: Deploy

1. Go to the **Deployments** tab
2. Railway automatically triggers a deployment when you push to your main branch
3. Watch the build logs to verify compilation succeeds
4. Once deployment is complete, click the generated URL to access the live app

## Demo Accounts

After deployment, use these credentials to log in:

- **Admin**: `maya@ethara.ai` / `orbit-82`
- **Member**: `jordan@ethara.ai` / `spark-14`

The app will auto-seed these demo users and sample projects/tasks on first run.

## Troubleshooting

### Build Fails

Check the **Build Logs** tab for errors. Common issues:

- Missing `DATABASE_URL`: Verify the environment variable is set
- Node version: Railway defaults to the latest Node LTS, which should work fine
- npm install errors: Check `package-lock.json` is committed

### App Crashes on Startup

Check the **Runtime Logs**. Common issues:

- Database file missing: Verify `SQLITE_PATH` points to a writable path
- App cannot write the file: Make sure the deployment has persistent storage or the path is writable

### Users Can't Log In

- Verify the database was seeded (check logs for "seeded" message)
- Confirm the demo credentials match what's shown above
- Try refreshing the browser (demo data loads asynchronously)

## Manual Local Testing (Before Deploy)

To test locally before pushing to Railway:

```bash
# Install dependencies
npm install

# Create .env.local with your SQLite file path
echo "SQLITE_PATH=data/ethara.sqlite" > .env.local

# Run dev server
npm run dev

# Or run production build
npm run build
npm start
```

Open http://localhost:3000 and test with demo credentials.

## After Deployment

Once live:

1. Capture the Railway URL (e.g., `https://ethara-task-manager-production.up.railway.app`)
2. Submit this URL as your assignment submission link
3. Optional: Create a GitHub release or tag for version control
4. Share the live URL with reviewers

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Next.js Deployment Docs](https://nextjs.org/docs/app/building-your-application/deploying)
