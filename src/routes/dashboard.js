const express = require('express');
const pool = require('../db/connection');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const day = new Date().getDate();
    const isMultaPeriod = day > 10;

    const residentes = await pool.query('SELECT COUNT(*) as count FROM residentes');
    const tickets = await pool.query('SELECT COUNT(*) as count, SUM(CASE WHEN prioridad = \'urgente\' THEN 1 ELSE 0 END) as urgentes FROM tickets_mantencion WHERE estado IN (\'abierto\', \'en_progreso\')');
    const reservas = await pool.query('SELECT COUNT(*) as count FROM reservas WHERE fecha >= CURRENT_DATE AND estado = \'confirmada\'');
    const reclamos = await pool.query('SELECT COUNT(*) as count FROM reclamos WHERE estado IN (\'abierto\', \'en_revision\')');
    const gastos = await pool.query('SELECT COUNT(*) as count FROM gastos_comunes WHERE estado_pago IN (\'pendiente\', \'vencido\')');

    res.json({
      ok: true,
      data: {
        total_residentes_activos: parseInt(residentes.rows[0].count),
        tickets_abiertos: parseInt(tickets.rows[0].count),
        tickets_urgentes: parseInt(tickets.rows[0].urgentes || 0),
        reservas_proximas: parseInt(reservas.rows[0].count),
        reclamos_pendientes: parseInt(reclamos.rows[0].count),
        gastos_pendientes: parseInt(gastos.rows[0].count),
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
