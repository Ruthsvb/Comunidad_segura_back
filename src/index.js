require('dotenv').config();
const express = require('express');
const corsMiddleware = require('./middleware/cors');
const { verifyToken } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const residentesRoutes = require('./routes/residentes');
const ticketsRoutes = require('./routes/tickets');
const reservasRoutes = require('./routes/reservas');
const reclamosRoutes = require('./routes/reclamos');
const gastosRoutes = require('./routes/gastos');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  const rawUrl = process.env.DATABASE_URL || '';
  const poolerUrl = rawUrl.replace(
    'db.gfnvocyhhcybnvuxfsmy.supabase.co:5432',
    'aws-0-sa-east-1.pooler.supabase.com:5432'
  );
  res.json({
    ok: true,
    message: 'Backend activo',
    db_mode: rawUrl ? 'real' : 'mock',
    db_host_raw: rawUrl ? rawUrl.split('@')[1]?.split(':')[0] : 'none',
    db_host_pooler: poolerUrl ? poolerUrl.split('@')[1]?.split(':')[0] : 'none',
    pooler_changed: rawUrl !== poolerUrl
  });
});

app.use(corsMiddleware);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/residentes', verifyToken, residentesRoutes);
app.use('/api/tickets', verifyToken, ticketsRoutes);
app.use('/api/reservas', verifyToken, reservasRoutes);
app.use('/api/reclamos', verifyToken, reclamosRoutes);
app.use('/api/gastos', verifyToken, gastosRoutes);

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
