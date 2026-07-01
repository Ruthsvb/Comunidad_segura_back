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
    const { unidad, fecha, espacio } = req.query;

    let query = supabase
      .from('reservas')
      .select('*, residentes(unidad, nombre, apellido)')
      .order('fecha', { ascending: false });

    if (req.user.rol !== 'admin') {
      query = query.eq('residente_id', req.user.id);
    } else if (unidad) {
      const { data: res2 } = await supabase.from('residentes').select('id').eq('unidad', unidad);
      const ids = (res2 || []).map(r => r.id);
      if (ids.length === 0) return res.json({ ok: true, data: [] });
      query = query.in('residente_id', ids);
    }

    if (fecha) query = query.eq('fecha', fecha);
    if (espacio) query = query.eq('espacio_comun', espacio);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    res.json({ ok: true, data: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al cargar reservas', detail: err.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ ok: false, error: 'Reserva no encontrada' });
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
    const { espacio_comun, fecha, hora_inicio, hora_fin, residente_id } = req.body;
    const rId = residente_id || req.user.id;

    if (!espacio_comun || !fecha || !hora_inicio || !hora_fin) {
      return res.status(400).json({ ok: false, error: 'Campos requeridos' });
    }

    const fechaReserva = new Date(fecha);
    const diff = (fechaReserva - new Date()) / (1000 * 60 * 60);
    if (diff < 48) {
      return res.status(400).json({ ok: false, error: 'Mínimo 48 horas de anticipación' });
    }

    // Conflicto horario — buscar reservas confirmadas mismo espacio y fecha
    const { data: conflictos } = await supabase
      .from('reservas')
      .select('id, hora_inicio, hora_fin')
      .eq('espacio_comun', espacio_comun)
      .eq('fecha', fecha)
      .eq('estado', 'confirmada');

    const hayConflicto = (conflictos || []).some(r =>
      hora_inicio < r.hora_fin && hora_fin > r.hora_inicio
    );

    if (hayConflicto) {
      return res.status(400).json({ ok: false, error: 'Horario ya reservado' });
    }

    const { data, error } = await supabase
      .from('reservas')
      .insert({ residente_id: rId, espacio_comun, fecha, hora_inicio, hora_fin, estado: 'pendiente' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al crear reserva', detail: err.message });
  }
});

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { espacio_comun, fecha, hora_inicio, hora_fin } = req.body;
    const updates = {};
    if (espacio_comun !== undefined) updates.espacio_comun = espacio_comun;
    if (fecha !== undefined) updates.fecha = fecha;
    if (hora_inicio !== undefined) updates.hora_inicio = hora_inicio;
    if (hora_fin !== undefined) updates.hora_fin = hora_fin;

    const { data, error } = await supabase
      .from('reservas')
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

router.patch('/:id/estado', verifyToken, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { estado } = req.body;
    if (!['confirmada', 'cancelada', 'pendiente'].includes(estado)) {
      return res.status(400).json({ ok: false, error: 'Estado inválido' });
    }

    const { data, error } = await supabase
      .from('reservas')
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
    await supabase.from('reservas').delete().eq('id', req.params.id);
    res.json({ ok: true, message: 'Reserva eliminada' });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al eliminar' });
  }
});

module.exports = router;
