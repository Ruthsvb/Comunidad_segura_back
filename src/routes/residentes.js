const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

const getSupabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

router.get('/', verifyToken, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('residentes')
      .select('id, nombre, apellido, unidad, email, telefono, rol, fecha_ingreso')
      .order('id');

    if (error) throw new Error(error.message);
    res.json({ ok: true, data: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al cargar residentes', detail: err.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('residentes')
      .select('id, nombre, apellido, unidad, email, telefono, rol, fecha_ingreso')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ ok: false, error: 'Residente no encontrado' });
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error' });
  }
});

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { nombre, apellido, unidad, email, telefono, rol } = req.body;

    const { data, error } = await supabase
      .from('residentes')
      .insert({
        nombre, apellido, unidad, email,
        telefono: telefono || '',
        rol: rol || 'residente',
        fecha_ingreso: new Date().toISOString().split('T')[0]
      })
      .select('id, nombre, apellido, unidad, email, telefono, rol, fecha_ingreso')
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al crear residente', detail: err.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.id !== parseInt(req.params.id) && req.user.rol !== 'admin') {
      return res.status(403).json({ ok: false, error: 'No tienes permiso' });
    }
    const supabase = getSupabase();
    const { nombre, apellido, telefono, email } = req.body;
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (apellido !== undefined) updates.apellido = apellido;
    if (telefono !== undefined) updates.telefono = telefono;
    if (email !== undefined) updates.email = email;

    const { data, error } = await supabase
      .from('residentes')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, nombre, apellido, unidad, email, telefono, rol, fecha_ingreso')
      .single();

    if (error) throw new Error(error.message);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al actualizar' });
  }
});

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    await supabase.from('residentes').delete().eq('id', req.params.id);
    res.json({ ok: true, message: 'Residente eliminado' });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al eliminar' });
  }
});

module.exports = router;
