const express = require('express');
const pool = require('../db/connection');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { unidad, estado } = req.query;
    let query = 'SELECT rc.* FROM reclamos rc JOIN residentes r ON rc.residente_id = r.id WHERE 1=1';
    const params = [];

    if (unidad) {
      query += ' AND r.unidad = $' + (params.length + 1);
      params.push(unidad);
    }
    if (estado) {
      query += ' AND rc.estado = $' + (params.length + 1);
      params.push(estado);
    }

    if (req.user.rol !== 'admin') {
      query += ' AND rc.residente_id = $' + (params.length + 1);
      params.push(req.user.id);
    }

    query += ' ORDER BY rc.fecha_creacion DESC';
    const result = await pool.query(query, params);
    res.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al cargar reclamos' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reclamos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, error: 'Reclamo no encontrado' });

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
    const { tipo, motivo, descripcion, unidad_afectada, residente_id } = req.body;
    const rId = residente_id || req.user.id;

    if (!tipo || !descripcion) {
      return res.status(400).json({ ok: false, error: 'Tipo y descripción requeridos' });
    }

    const result = await pool.query(
      'INSERT INTO reclamos (residente_id, tipo, motivo, descripcion, unidad_afectada, estado, fecha_creacion) VALUES ($1, $2, $3, $4, $5, \'abierto\', NOW()) RETURNING *',
      [rId, tipo, motivo || tipo, descripcion, unidad_afectada || '']
    );
    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al crear reclamo' });
  }
});

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { tipo, motivo, descripcion, unidad_afectada, prioridad } = req.body;
    const result = await pool.query(
      'UPDATE reclamos SET tipo = COALESCE($1, tipo), motivo = COALESCE($2, motivo), descripcion = COALESCE($3, descripcion), unidad_afectada = COALESCE($4, unidad_afectada), prioridad = COALESCE($5, prioridad) WHERE id = $6 RETURNING *',
      [tipo, motivo, descripcion, unidad_afectada, prioridad, req.params.id]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al actualizar' });
  }
});

router.patch('/:id/estado', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['abierto', 'en_revision', 'resuelto', 'desestimado'].includes(estado)) {
      return res.status(400).json({ ok: false, error: 'Estado inválido' });
    }

    const result = await pool.query('UPDATE reclamos SET estado = $1 WHERE id = $2 RETURNING *', [estado, req.params.id]);
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error' });
  }
});

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM reclamos WHERE id = $1', [req.params.id]);
    res.json({ ok: true, message: 'Reclamo eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al eliminar' });
  }
});

module.exports = router;
