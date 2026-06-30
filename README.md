# Comunidad Segura - Backend

Backend Node.js + Express + PostgreSQL para sistema de gestión de condominio.

## Setup

```bash
npm install
cp .env.example .env
# Edita .env con credenciales Supabase y JWT_SECRET
npm start
```

## Endpoints

### Auth
- `POST /api/auth/login` - Login con email/password
- `POST /api/auth/logout` - Logout

### Dashboard
- `GET /api/dashboard` - Conteos y alertas

### CRUD (con auth)
- `/api/residentes`
- `/api/tickets`
- `/api/reservas`
- `/api/reclamos`
- `/api/gastos`

## Deploy Render

1. Push código a GitHub
2. En Render.com: New > Web Service
3. Conecta repo
4. Usa `render.yaml` como config
5. Agrega secrets: `DATABASE_URL`, `JWT_SECRET`
6. Deploy automático

## Reglas de Negocio

- Reservas: mínimo 48h anticipación
- Gastos: multa 1.5% si día > 10 y estado = pendiente
- Tickets urgentes: vencido si estado = abierto + 24h
- Auth: JWT 24h, role-based (admin/residente)
