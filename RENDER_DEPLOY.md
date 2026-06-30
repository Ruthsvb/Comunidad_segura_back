# Deploy a Render.com

## Pre-requisitos
- GitHub repo `github.com/Ruthsvb/comunidad-segura-backend` (crear primero)
- Cuenta Render.com (free tier)
- Supabase PostgreSQL connection string
- JWT_SECRET (min 32 chars): `openssl rand -hex 16`
- Ver SECURITY.md antes de deploy

## Pasos

### 1. Push a GitHub
```bash
git remote add origin https://github.com/Ruthsvb/comunidad-segura-backend.git
git branch -M main
git push -u origin main
```

### 2. En Render.com Dashboard

1. **New → Web Service**
2. **Connect Repository**
   - GitHub → Authorize
   - Select: `Ruthsvb/comunidad-segura-backend`
3. **Service Configuration**
   - Name: `comunidad-segura-backend`
   - Root Directory: `.` (or leave blank - auto-detect)
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node src/index.js`
   - Plan: `Free`

4. **Environment Variables** (set in Render dashboard, not in code)
   Dashboard → Settings → Environment:
   - DATABASE_URL: `postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres`
   - JWT_SECRET: `[strong 32+ char random string]` (use `openssl rand -hex 16`)
   - CORS_ORIGIN: `https://comunidad-seguraproject.vercel.app`
   - NODE_ENV: `production`
   
   ⚠️ NEVER commit .env file with credentials

5. **Deploy**
   - Click "Create Web Service"
   - Wait 2-3 minutes for build
   - Copy the generated URL: `https://cs-backend-xxxx.onrender.com`

## Verificar Deploy

```bash
# Health check
curl https://[your-url].onrender.com/health

# Expected response
# {"ok":true,"message":"Backend activo"}
```

## Configurar Frontend

En Vercel:
1. Project Settings → Environment Variables
2. Add: `VITE_API_URL = https://[your-url].onrender.com`
3. Redeploy
