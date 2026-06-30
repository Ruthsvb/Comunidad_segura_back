const express = require('express');
const pool = require('../db/connection');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { unidad, estado, prioridad } = req.query;
    let query = 'SELECT t.* FROM tickets_mantencion t JOIN residentes r ON t.residente_id = r.id WHERE 1=1';
    const params = [];

    if (unidad) {
      query += ' AND r.unidad = $' + (params.length + 1);
      params.push(unidad);
    }
    if (estado) {
      query += ' AND t.estado = $' + (params.length + 1);
      params.push(estado);
    }
    if (prioridad) {
      query += ' AND t.prioridad = $' + (params.length + 1);
      params.push(prioridad);
    }

    if (req.user.rol !== 'admin') {
      query += ' AND t.residente_id = $' + (params.length + 1);
      params.push(req.user.id);
    }

    query += ' ORDER BY t.fecha_creacion DESC';
    const result = await pool.query(query, params);
    res.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al cargar tickets' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tickets_mantencion WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, error: 'Ticket no encontrado' });

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
    const { titulo, categoria, descripcion, prioridad, residente_id } = req.body;
    const rId = residente_id || req.user.id;

    if (!titulo || !categoria || !descripcion) {
      return res.status(400).json({ ok: false, error: 'Campos requeridos' });
    }

    const result = await pool.query(
      'INSERT INTO tickets_mantencion (titulo, categoria, descripcion, prioridad, residente_id, estado, fecha_creacion) VALUES ($1, $2, $3, $4, $5, \'abierto\', NOW()) RETURNING *',
      [titulo, categoria, descripcion, prioridad || 'media', rId]
    );
    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al crear ticket' });
  }
});

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { titulo, categoria, descripcion, prioridad } = req.body;
    const result = await pool.query(
      'UPDATE tickets_mantencion SET titulo = COALESCE($1, titulo), categoria = COALESCE($2, categoria), descripcion = COALESCE($3, descripcion), prioridad = COALESCE($4, prioridad) WHERE id = $5 RETURNING *',
      [titulo, categoria, descripcion, prioridad, req.params.id]
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
    if (!['abierto', 'en_progreso', 'cerrado'].includes(estado)) {
      return res.status(400).json({ ok: false, error: 'Estado inválido' });
    }

    const query = estado === 'cerrado'
      ? 'UPDATE tickets_mantencion SET estado = $1, fecha_resolucion = NOW() WHERE id = $2 RETURNING *'
      : 'UPDATE tickets_mantencion SET estado = $1 WHERE id = $2 RETURNING *';

    const result = await pool.query(query, [estado, req.params.id]);
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error' });
  }
});

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM tickets_mantencion WHERE id = $1', [req.params.id]);
    res.json({ ok: true, message: 'Ticket eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al eliminar' });
  }
});

module.exports = router;
