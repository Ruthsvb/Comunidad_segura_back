const express = require('express');
const pool = require('../db/connection');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { unidad, fecha, espacio } = req.query;
    let query = 'SELECT rv.* FROM reservas rv JOIN residentes r ON rv.residente_id = r.id WHERE 1=1';
    const params = [];

    if (unidad) {
      query += ' AND r.unidad = $' + (params.length + 1);
      params.push(unidad);
    }
    if (fecha) {
      query += ' AND rv.fecha = $' + (params.length + 1);
      params.push(fecha);
    }
    if (espacio) {
      query += ' AND rv.espacio_comun = $' + (params.length + 1);
      params.push(espacio);
    }

    if (req.user.rol !== 'admin') {
      query += ' AND rv.residente_id = $' + (params.length + 1);
      params.push(req.user.id);
    }

    query += ' ORDER BY rv.fecha DESC, rv.hora_inicio ASC';
    const result = await pool.query(query, params);
    res.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al cargar reservas' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reservas WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, error: 'Reserva no encontrada' });

    if (req.user.rol !== 'admin' && result.rows[0].residente_id !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'No tienes permiso' });
    }
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { espacio_comun, fecha, hora_inicio, hora_fin, residente_id } = req.body;
    const rId = residente_id || req.user.id;

    if (!espacio_comun || !fecha || !hora_inicio || !hora_fin) {
      return res.status(400).json({ ok: false, error: 'Campos requeridos' });
    }

    const fechaReserva = new Date(fecha);
    const ahora = new Date();
    const diff = (fechaReserva - ahora) / (1000 * 60 * 60);

    if (diff < 48) {
      return res.status(400).json({ ok: false, error: 'Mínimo 48 horas de anticipación' });
    }

    const conflicto = await pool.query(
      'SELECT id FROM reservas WHERE espacio_comun = $1 AND fecha = $2 AND estado = \'confirmada\' AND ((hora_inicio, hora_fin) OVERLAPS ($3::time, $4::time))',
      [espacio_comun, fecha, hora_inicio, hora_fin]
    );

    if (conflicto.rows.length > 0) {
      return res.status(400).json({ ok: false, error: 'Horario ya reservado' });
    }

    const result = await pool.query(
      'INSERT INTO reservas (residente_id, espacio_comun, fecha, hora_inicio, hora_fin, estado) VALUES ($1, $2, $3, $4, $5, \'confirmada\') RETURNING *',
      [rId, espacio_comun, fecha, hora_inicio, hora_fin]
    );
    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al crear reserva' });
  }
});

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { espacio_comun, fecha, hora_inicio, hora_fin } = req.body;
    const result = await pool.query(
      'UPDATE reservas SET espacio_comun = COALESCE($1, espacio_comun), fecha = COALESCE($2, fecha), hora_inicio = COALESCE($3, hora_inicio), hora_fin = COALESCE($4, hora_fin) WHERE id = $5 RETURNING *',
      [espacio_comun, fecha, hora_inicio, hora_fin, req.params.id]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al actualizar' });
  }
});

router.patch('/:id/estado', verifyToken, async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['confirmada', 'cancelada', 'pendiente'].includes(estado)) {
      return res.status(400).json({ ok: false, error: 'Estado inválido' });
    }

    const result = await pool.query('UPDATE reservas SET estado = $1 WHERE id = $2 RETURNING *', [estado, req.params.id]);
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error' });
  }
});

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM reservas WHERE id = $1', [req.params.id]);
    res.json({ ok: true, message: 'Reserva eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al eliminar' });
  }
});

module.exports = router;
