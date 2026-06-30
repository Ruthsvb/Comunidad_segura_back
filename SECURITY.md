# Security Configuration - Comunidad Segura

## ✅ Completed

### Row Level Security (RLS) - Supabase
- **Status**: ENABLED on all tables (2026-06-29)
- **Tables Protected**: 
  - residentes
  - tickets_mantencion
  - reservas
  - reclamos
  - gastos_comunes
  - gastos_comunes_detalle
  - cs_chat_histories

### Policies Applied
- **Residentes**: Users can only see their own data (unless admin)
- **Tickets**: Users see only their tickets (unless admin)
- **Reservas**: Users see only their reservations (unless admin)
- **Reclamos**: Users see only their complaints (unless admin)
- **Gastos**: Users see only their expenses (unless admin)
- **Admin**: Can see all data

## 🔒 Environment Variables

**NEVER commit credentials.** Use Render dashboard secrets:

```env
# Render.com Environment Variables (Secrets)
DATABASE_URL = [Supabase connection string]
JWT_SECRET = [min 32 chars, strong random]
```

See `.env.example` for template structure.

## 🔐 Password Management

### Supabase
- Default password: Should be changed at https://supabase.com/dashboard
- Current: Use strong, unique password
- Rotate: Every 90 days

### JWT Secret
- Min 32 characters
- Strong random (use: `openssl rand -hex 16`)
- Never share
- Rotate: Every 6 months or if compromised

## 📋 Pre-Deployment Checklist

- [ ] DATABASE_URL set in Render secrets (not in .env)
- [ ] JWT_SECRET set in Render secrets (min 32 chars)
- [ ] RLS enabled and policies verified
- [ ] CORS_ORIGIN restricted to Vercel domain
- [ ] NODE_ENV = production
- [ ] SSL enabled for Supabase connection

## 🚨 Known Issues (if any)

None currently.

## References

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- JWT Best Practices: https://tools.ietf.org/html/rfc8725
