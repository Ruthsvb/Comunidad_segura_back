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
    const { unidad } = req.query;

    let query = supabase
      .from('gastos_comunes')
      .select('*, residentes(unidad, nombre, apellido)')
      .order('fecha_vencimiento', { ascending: false });

    if (req.user.rol !== 'admin') {
      query = query.eq('residente_id', req.user.id);
    } else if (unidad) {
      // admin filtrando por unidad: buscar residente_id de esa unidad
      const { data: res2 } = await supabase.from('residentes').select('id').eq('unidad', unidad);
      const ids = (res2 || []).map(r => r.id);
      if (ids.length === 0) return res.json({ ok: true, data: [] });
      query = query.in('residente_id', ids);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    res.json({ ok: true, data: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al cargar gastos', detail: err.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('gastos_comunes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ ok: false, error: 'Gasto no encontrado' });
    if (req.user.rol !== 'admin' && data.residente_id !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'No tienes permiso' });
    }
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error' });
  }
});

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { residente_id, periodo, monto_total, monto_total_clp, monto_total_uf, fecha_vencimiento } = req.body;

    if (!residente_id || !periodo || !monto_total) {
      return res.status(400).json({ ok: false, error: 'Campos requeridos' });
    }

    const { data, error } = await supabase
      .from('gastos_comunes')
      .insert({
        residente_id,
        periodo,
        monto_total,
        monto_total_clp: monto_total_clp || monto_total,
        monto_total_uf: monto_total_uf || monto_total / 1000,
        estado_pago: 'pendiente',
        fecha_vencimiento
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al crear gasto', detail: err.message });
  }
});

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { monto_total, monto_total_clp, monto_total_uf, fecha_vencimiento } = req.body;
    const updates = {};
    if (monto_total !== undefined) updates.monto_total = monto_total;
    if (monto_total_clp !== undefined) updates.monto_total_clp = monto_total_clp;
    if (monto_total_uf !== undefined) updates.monto_total_uf = monto_total_uf;
    if (fecha_vencimiento !== undefined) updates.fecha_vencimiento = fecha_vencimiento;

    const { data, error } = await supabase
      .from('gastos_comunes')
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

router.patch('/:id/estado-pago', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { estado_pago } = req.body;
    if (!['pendiente', 'pagado', 'vencido'].includes(estado_pago)) {
      return res.status(400).json({ ok: false, error: 'Estado inválido' });
    }

    const updates = { estado_pago };
    if (estado_pago === 'pagado') updates.fecha_pago = new Date().toISOString();

    const { data, error } = await supabase
      .from('gastos_comunes')
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
    await supabase.from('gastos_comunes').delete().eq('id', req.params.id);
    res.json({ ok: true, message: 'Gasto eliminado' });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error al eliminar' });
  }
});

module.exports = router;
