const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const getSupabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

router.get('/', verifyToken, async (req, res) => {
  try {
    const supabase = getSupabase();
    const day = new Date().getDate();
    const isMultaPeriod = day > 10;
    const today = new Date().toISOString().split('T')[0];

    const [residentes, tickets, ticketsUrgentes, reservas, reclamos, gastos] = await Promise.all([
      supabase.from('residentes').select('*', { count: 'exact', head: true }),
      supabase.from('tickets_mantencion').select('*', { count: 'exact', head: true }).in('estado', ['abierto', 'en_progreso']),
      supabase.from('tickets_mantencion').select('*', { count: 'exact', head: true }).in('estado', ['abierto', 'en_progreso']).eq('prioridad', 'urgente'),
      supabase.from('reservas').select('*', { count: 'exact', head: true }).gte('fecha', today).eq('estado', 'confirmada'),
      supabase.from('reclamos').select('*', { count: 'exact', head: true }).in('estado', ['abierto', 'en_revision']),
      supabase.from('gastos_comunes').select('*', { count: 'exact', head: true }).in('estado_pago', ['pendiente', 'vencido'])
    ]);

    res.json({
      ok: true,
      data: {
        total_residentes_activos: residentes.count || 0,
        tickets_abiertos: tickets.count || 0,
        tickets_urgentes: ticketsUrgentes.count || 0,
        reservas_proximas: reservas.count || 0,
        reclamos_pendientes: reclamos.count || 0,
        gastos_pendientes: gastos.count || 0,
        multa_gastos_comunes_activa: isMultaPeriod,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al cargar dashboard' });
  }
});

module.exports = router;
