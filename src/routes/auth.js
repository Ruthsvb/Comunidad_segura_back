const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db/connection');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Email y password requeridos' });

    const result = await pool.query('SELECT * FROM residentes WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });

    const resident = result.rows[0];
    const token = jwt.sign(
      { id: resident.id, email: resident.email, rol: resident.rol, unidad: resident.unidad },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ ok: true, token, resident: { id: resident.id, nombre: resident.nombre, apellido: resident.apellido, unidad: resident.unidad, email: resident.email, rol: resident.rol } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error en login' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ ok: true, message: 'Logout exitoso' });
});

module.exports = router;
