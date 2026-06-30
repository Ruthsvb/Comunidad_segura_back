const express = require('express');
const pool = require('../db/connection');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { unidad, periodo } = req.query;
    let query = 'SELECT gc.*, json_agg(json_build_object(\'concepto\', gcd.concepto, \'monto\', gcd.monto)) FILTER (WHERE gcd.id IS NOT NULL) as detalles FROM gastos_comunes gc JOIN residentes r ON gc.residente_id = r.id LEFT JOIN gastos_comunes_detalle gcd ON gcd.gasto_comun_id = gc.id WHERE 1=1';
    const params = [];

    if (unidad) {
      query += ' AND r.unidad = $' + (params.length + 1);
      params.push(unidad);
    }
    if (periodo) {
      query += ' AND gc.periodo = $' + (params.length + 1);
      params.push(periodo);
    }

    if (req.user.rol !== 'admin') {
      query += ' AND gc.residente_id = $' + (params.length + 1);
      params.push(req.user.id);
    }

    query += ' GROUP BY gc.id, r.id ORDER BY gc.fecha_vencimiento DESC';
    const result = await pool.query(query, params);
    res.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al cargar gastos' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT gc.*, json_agg(json_build_object(\'concepto\', gcd.concepto, \'monto\', gcd.monto)) FILTER (WHERE gcd.id IS NOT NULL) as detalles FROM gastos_comunes gc LEFT JOIN gastos_comunes_detalle gcd ON gcd.gasto_comun_id = gc.id WHERE gc.id = $1 GROUP BY gc.id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, error: 'Gasto no encontrado' });

    if (req.user.rol !== 'admin' && result.rows[0].residente_id !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'No tienes permiso' });
    }
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error' });
  }
});

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { residente_id, periodo, monto_total, monto_total_clp, monto_total_uf, fecha_vencimiento, detalles } = req.body;

    if (!residente_id || !periodo || !monto_total) {
      return res.status(400).json({ ok: false, error: 'Campos requeridos' });
    }

    const result = await pool.query(
      'INSERT INTO gastos_comunes (residente_id, periodo, monto_total, monto_total_clp, monto_total_uf, estado_pago, fecha_vencimiento) VALUES ($1, $2, $3, $4, $5, \'pendiente\', $6) RETURNING *',
      [residente_id, periodo, monto_total, monto_total_clp || monto_total, monto_total_uf || monto_total / 1000, fecha_vencimiento]
    );

    if (detalles && Array.isArray(detalles)) {
      for (const { concepto, monto } of detalles) {
        await pool.query(
          'INSERT INTO gastos_comunes_detalle (gasto_comun_id, concepto, monto) VALUES ($1, $2, $3)',
          [result.rows[0].id, concepto, monto]
        );
      }
    }

    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al crear gasto' });
  }
});

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { monto_total, monto_total_clp, monto_total_uf, fecha_vencimiento } = req.body;
    const result = await pool.query(
      'UPDATE gastos_comunes SET monto_total = COALESCE($1, monto_total), monto_total_clp = COALESCE($2, monto_total_clp), monto_total_uf = COALESCE($3, monto_total_uf), fecha_vencimiento = COALESCE($4, fecha_vencimiento) WHERE id = $5 RETURNING *',
      [monto_total, monto_total_clp, monto_total_uf, fecha_vencimiento, req.params.id]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al actualizar' });
  }
});

router.patch('/:id/estado-pago', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { estado_pago } = req.body;
    if (!['pendiente', 'pagado', 'vencido'].includes(estado_pago)) {
      return res.status(400).json({ ok: false, error: 'Estado inválido' });
    }

    const query = estado_pago === 'pagado'
      ? 'UPDATE gastos_comunes SET estado_pago = $1, fecha_pago = NOW() WHERE id = $2 RETURNING *'
      : 'UPDATE gastos_comunes SET estado_pago = $1 WHERE id = $2 RETURNING *';

    const result = await pool.query(query, [estado_pago, req.params.id]);
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error' });
  }
});

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM gastos_comunes_detalle WHERE gasto_comun_id = $1', [req.params.id]);
    await pool.query('DELETE FROM gastos_comunes WHERE id = $1', [req.params.id]);
    res.json({ ok: true, message: 'Gasto eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al eliminar' });
  }
});

module.exports = router;
