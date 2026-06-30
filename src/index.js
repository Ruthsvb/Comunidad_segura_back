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
  res.json({ ok: true, message: 'Backend activo' });
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
