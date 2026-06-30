# n8n Migration Status - Comunidad Segura

## Overview
Backend Express reemplaza APIs web de n8n. Workflow n8n se simplifica para solo bots.

## API Migration Status

| API | Endpoint n8n | Backend Express | Frontend | Status |
|-----|----------------|-----------------|----------|--------|
| **Tickets** | `/cs/tickets` | ✅ `GET /api/tickets` | ✅ Migrated | **READY** |
| **Reservas** | `/cs/reservas` | ✅ `GET /api/reservas` | ✅ Migrated | **READY** |
| **Reclamos** | `/cs/reclamos` | ✅ `GET /api/reclamos` | ✅ Migrated | **READY** |
| **Gastos** | `/cs/gastos` | ✅ `GET /api/gastos` | ✅ Migrated | **READY** |
| **Dashboard** | `/comunidad-segura/dashboard` | ✅ `GET /api/dashboard` | ⏳ Dual mode | **TRANSITIONAL** |
| **Residentes** | `/comunidad-segura/residentes` | ✅ `GET /api/residentes` | ⏳ Dual mode | **TRANSITIONAL** |
| **Auth** | Manual login | ✅ `POST /api/auth/login` | ✅ Migrated | **READY** |

## n8n Workflow Cleanup Plan

**Workflow**: Comunidad Segura - Agente Principal (ID: yNWUzxH3DuGOWUOW)

### Nodes to Delete (17 total)
- ❌ API Tickets webhook + Query + Response
- ❌ API Reservas Web webhook + Query + Response
- ❌ API Reclamos Web webhook + Query + Response
- ❌ API Gastos Web webhook + Query + Response
- ❌ Pasa Guardrail? (orphan IF node)
- ❌ Pasa Guardrail Web? (orphan IF node)
- ❌ Descargar Audio (legacy HTTP)
- ❌ Descargar Imagen (legacy HTTP)
- ❌ Transcribir Audio Groq (redundant OpenAI)

### Nodes to Preserve

**Telegram Bot** (~25 nodes)
- Trigger, message detection, guardrails, agent, tools
- Audio processing, image processing
- Email confirmations, calendar integration

**Webchat Bot** (~20 nodes)
- Trigger, message extraction, guardrails, agent, tools
- Email confirmations, calendar integration
- Response formatting

**APIs (Temporary)** (~13 nodes)
- Dashboard: webhook → query → enrich → respond
- Residentes: webhook → query → respond
- Status: webhook → format JSON → respond

**Total**: 90 nodes → ~73 nodes after cleanup

## Backend Deployment Checklist

- [ ] Database credentials moved to Render env vars (not .env)
- [ ] RLS enabled in Supabase (✅ DONE)
- [ ] JWT secret generated and set in Render
- [ ] CORS configured for Vercel frontend
- [ ] Health endpoint responding at `/health`
- [ ] All CRUD endpoints tested locally
- [ ] Deploy to Render.com
- [ ] Update Vercel VITE_API_URL env var
- [ ] Test full frontend flow (login → CRUD → dashboard)

## Testing Strategy

### Phase 1: Backend Validation (Pre-deployment)
```bash
# Local testing
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/auth/login -d '{...}'
npm test  # if tests exist
```

### Phase 2: Render Deployment
1. Push to GitHub repo
2. Connect Render service
3. Set environment variables
4. Verify `/health` responds
5. Test 1-2 key endpoints

### Phase 3: Frontend Migration
1. Update VITE_API_URL in Vercel
2. Monitor network requests (should go to backend, not n8n)
3. Test login flow
4. Test create ticket flow
5. Verify persistence

### Phase 4: n8n Cleanup (After Backend Confirmed)
1. Delete 17 nodes from workflow
2. Test Telegram bot
3. Test Webchat bot
4. Publish workflow

## API Response Examples

### Backend Tickets Response
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "titulo": "Ascensor dañado",
      "categoria": "ascensor",
      "prioridad": "urgente",
      "estado": "abierto",
      "fecha_creacion": "2026-06-29T10:00:00Z"
    }
  ]
}
```

### n8n Dashboard Response (keeping for now)
```json
{
  "ok": true,
  "data": {
    "total_residentes_activos": 8,
    "tickets_abiertos": 5,
    "tickets_urgentes": 2,
    "reservas_proximas": 3,
    "reclamos_pendientes": 2,
    "gastos_pendientes": 6,
    "multa_gastos_comunes_activa": false
  }
}
```

## Timeline

| Phase | Task | Status | ETA |
|-------|------|--------|-----|
| 1 | Backend development | ✅ DONE | - |
| 2 | Frontend migration | ✅ DONE | - |
| 3 | Backend deployment | ⏳ PENDING | User action |
| 4 | Frontend env var update | ⏳ PENDING | User action |
| 5 | Full testing | ⏳ PENDING | After deployment |
| 6 | n8n cleanup | ⏳ PENDING | After confirmed |
| 7 | Dashboard API migration | ⏳ PENDING | 1 week after |
| 8 | Residentes API migration | ⏳ PENDING | 1 week after |

## Notes

- Backend is production-ready, awaiting Render deployment
- Frontend already updated to call backend APIs
- n8n cleanup is safe and can be done anytime after backend deployment confirmed
- Dashboard/Residentes APIs can stay in n8n temporarily for redundancy
- After 1-2 weeks of stable backend, migrate those 2 APIs and fully decommission n8n API layer
