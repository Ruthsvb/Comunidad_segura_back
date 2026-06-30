# Deploy a Render.com

## Pre-requisitos
- GitHub repo `github.com/Ruthsvb/comunidad-segura-backend`
- Cuenta Render.com
- Supabase connection string

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

4. **Environment Variables**
   Add these as Secrets (dashboard → Settings):
   ```
   DATABASE_URL = postgresql://postgres:XilKeYxMe9XaREFj@db.gfnvocyhhcybnvuxfsmy.supabase.co:5432/postgres
   JWT_SECRET = comunidad_segura_jwt_2026
   CORS_ORIGIN = https://comunidad-seguraproject.vercel.app
   NODE_ENV = production
   ```

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
