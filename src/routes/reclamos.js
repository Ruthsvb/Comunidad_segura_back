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
    const { unidad, estado } = req.query;

    let query = supabase
      .from('reclamos')
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

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    res.json({ ok: true, data: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al cargar reclamos', detail: err.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('reclamos')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ ok: false, error: 'Reclamo no encontrado' });
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
    const { tipo, motivo, descripcion, unidad_afectada, residente_id } = req.body;
    const rId = residente_id || req.user.id;

    if (!tipo || !descripcion) {
      return res.status(400).json({ ok: false, error: 'Tipo y descripción requeridos' });
    }

    const { data, error } = await supabase
      .from('reclamos')
      .insert({
        residente_id: rId,
        tipo,
        motivo: motivo || tipo,
        descripcion,
        unidad_afectada: unidad_afectada || '',
        estado: 'abierto',
        fecha_creacion: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al crear reclamo', detail: err.message });
  }
});

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { tipo, motivo, descripcion, unidad_afectada, prioridad } = req.body;
    const updates = {};
    if (tipo !== undefined) updates.tipo = tipo;
    if (motivo !== undefined) updates.motivo = motivo;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (unidad_afectada !== undefined) updates.unidad_afectada = unidad_afectada;
    if (prioridad !== undefined) updates.prioridad = prioridad;

    const { data, error } = await supabase
      .from('reclamos')
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
    if (!['abierto', 'en_revision', 'resuelto', 'desestimado'].includes(estado)) {
      return res.status(400).json({ ok: false, error: 'Estado inválido' });
    }

    const { data, error } = await supabase
      .from('reclamos')
      .update({ estado })
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
    await supabase.from('reclamos').delete().eq('id', req.params.id);
    res.json({ ok: true, message: 'Reclamo eliminado' });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al eliminar' });
  }
});

module.exports = router;
