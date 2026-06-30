# Deploy a Render.com

## Pasos

1. **Crear repo GitHub** (si no existe)
   ```bash
   git remote add origin https://github.com/Ruthsvb/comunidad-segura-backend.git
   git push -u origin main
   ```

2. **En Render.com Dashboard**
   - Nuevo > Web Service
   - Conectar GitHub (autorizar)
   - Seleccionar repo `comunidad-segura-backend`
   - Render detecta `render.yaml`
   - Asignar nombre: `comunidad-segura-backend`

3. **Environment Variables (Secrets)**
   - `DATABASE_URL`: postgresql://postgres:[PASSWORD]@db.gfnvocyhhcybnvuxfsmy.supabase.co:5432/postgres
   - `JWT_SECRET`: generar string aleatorio 32+ chars

4. **Deploy**
   - Click "Create Web Service"
   - Esperar ~2-3 min
   - URL será: `https://comunidad-segura-backend.onrender.com`

5. **Verificar**
   ```bash
   curl https://comunidad-segura-backend.onrender.com/health
   # Response: {"ok":true,"message":"Backend activo"}
   ```

6. **Actualizar Frontend**
   - En `/comunidad_segura/.env.local` o en n8n webhooks:
   - Cambiar BASE URL de `http://localhost:3000` a `https://comunidad-segura-backend.onrender.com`

## Variables Críticas

- **DATABASE_URL**: Debe ser pooler de Supabase (puerto 6543 o 5432 con SSL)
- **JWT_SECRET**: Cambiar en producción (NO usar default)
- **CORS_ORIGIN**: Ya configurado para Vercel frontend

## Monitoreo

- Logs en Render dashboard
- Health check: `GET /health` retorna ok=true
- DB connection test: `SELECT COUNT(*) FROM residentes`
