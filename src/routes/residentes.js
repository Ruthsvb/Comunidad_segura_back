const express = require('express');
const pool = require('../db/connection');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, apellido, unidad, email, telefono, rol, fecha_ingreso FROM residentes ORDER BY id');
    res.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al cargar residentes' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, apellido, unidad, email, telefono, rol, fecha_ingreso FROM residentes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ ok: false, error: 'Residente no encontrado' });
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error' });
  }
});

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { nombre, apellido, unidad, email, telefono, rol } = req.body;
    const result = await pool.query(
      'INSERT INTO residentes (nombre, apellido, unidad, email, telefono, rol, fecha_ingreso) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
      [nombre, apellido, unidad, email, telefono, rol || 'residente']
    );
    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al crear residente' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id) && req.user.rol !== 'admin') {
      return res.status(403).json({ ok: false, error: 'No tienes permiso' });
    }
    const { nombre, apellido, telefono, email } = req.body;
    const result = await pool.query(
      'UPDATE residentes SET nombre = COALESCE($1, nombre), apellido = COALESCE($2, apellido), telefono = COALESCE($3, telefono), email = COALESCE($4, email) WHERE id = $5 RETURNING *',
      [nombre, apellido, telefono, email, req.params.id]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al actualizar' });
  }
});

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM residentes WHERE id = $1', [req.params.id]);
    res.json({ ok: true, message: 'Residente eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al eliminar' });
  }
});

module.exports = router;
