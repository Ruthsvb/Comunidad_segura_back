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
    const { unidad, estado, prioridad } = req.query;

    let query = supabase
      .from('tickets_mantencion')
      .select('*, residentes(unidad, nombre, apellido)')
      .order('fecha_creacion', { ascending: false });

    if (req.user.rol !== 'admin') {
      query = query.eq('residente_id', req.user.id);
    } else if (unidad) {
      const { data: res2 } = await supabase.from('residentes').select('id').eq('unidad', unidad);
      const ids = (res2 || []).map(r => r.id);
      if (ids.length === 0) return res.json({ ok: true, data: [] });
      query = query.in('residente_id', ids);
    }

    if (estado) query = query.eq('estado', estado);
    if (prioridad) query = query.eq('prioridad', prioridad);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    res.json({ ok: true, data: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al cargar tickets', detail: err.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('tickets_mantencion')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ ok: false, error: 'Ticket no encontrado' });
    if (req.user.rol !== 'admin' && data.residente_id !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'No tienes permiso' });
    }
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { titulo, categoria, descripcion, prioridad, residente_id } = req.body;
    const rId = residente_id || req.user.id;

    if (!titulo || !categoria || !descripcion) {
      return res.status(400).json({ ok: false, error: 'Campos requeridos' });
    }

    const { data, error } = await supabase
      .from('tickets_mantencion')
      .insert({
        titulo,
        categoria,
        descripcion,
        prioridad: prioridad || 'media',
        residente_id: rId,
        estado: 'abierto',
        fecha_creacion: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al crear ticket', detail: err.message });
  }
});

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { titulo, categoria, descripcion, prioridad } = req.body;
    const updates = {};
    if (titulo !== undefined) updates.titulo = titulo;
    if (categoria !== undefined) updates.categoria = categoria;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (prioridad !== undefined) updates.prioridad = prioridad;

    const { data, error } = await supabase
      .from('tickets_mantencion')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al actualizar' });
  }
});

router.patch('/:id/estado', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { estado } = req.body;
    if (!['abierto', 'en_progreso', 'cerrado'].includes(estado)) {
      return res.status(400).json({ ok: false, error: 'Estado inválido' });
    }

    const updates = { estado };
    if (estado === 'cerrado') updates.fecha_resolucion = new Date().toISOString();

    const { data, error } = await supabase
      .from('tickets_mantencion')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error' });
  }
});

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    await supabase.from('tickets_mantencion').delete().eq('id', req.params.id);
    res.json({ ok: true, message: 'Ticket eliminado' });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al eliminar' });
  }
});

module.exports = router;
