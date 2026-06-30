const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const MOCK_MODE = !SUPABASE_URL || !SUPABASE_KEY;

let supabase = null;

if (MOCK_MODE) {
  console.log('⚠️  Mock mode: sin conexión a Supabase');
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });
  console.log('✅ Supabase client conectado via REST (IPv4)');
}

// Compatibilidad con código existente que usa pool.query(sql, params)
// Traduce queries SQL simples a llamadas Supabase REST
const pool = {
  query: async (sql, params = []) => {
    if (MOCK_MODE) return mockQuery(sql, params);

    const sqlTrim = sql.trim().toUpperCase();

    // SELECT * FROM tabla WHERE campo = $1
    if (sqlTrim.startsWith('SELECT')) {
      return supabaseSelect(sql, params);
    }

    // INSERT INTO tabla (...) VALUES (...) RETURNING *
    if (sqlTrim.startsWith('INSERT')) {
      return supabaseInsert(sql, params);
    }

    // UPDATE tabla SET campo = $1 WHERE id = $2 RETURNING *
    if (sqlTrim.startsWith('UPDATE')) {
      return supabaseUpdate(sql, params);
    }

    // DELETE FROM tabla WHERE id = $1
    if (sqlTrim.startsWith('DELETE')) {
      return supabaseDelete(sql, params);
    }

    // SELECT COUNT(*) — handled in supabaseSelect
    return { rows: [] };
  }
};

// Parsea tabla de SQL simple
function parseTable(sql) {
  const m = sql.match(/FROM\s+(\w+)/i) || sql.match(/INTO\s+(\w+)/i) || sql.match(/UPDATE\s+(\w+)/i) || sql.match(/FROM\s+(\w+)/i);
  return m ? m[1] : null;
}

async function supabaseSelect(sql, params) {
  const table = parseTable(sql);
  if (!table) throw new Error('No se pudo parsear tabla: ' + sql);

  let query = supabase.from(table).select('*');

  // WHERE email = $1
  const whereEmail = sql.match(/WHERE\s+email\s*=\s*\$1/i);
  if (whereEmail && params[0]) query = query.eq('email', params[0]);

  // WHERE id = $1
  const whereId = sql.match(/WHERE\s+id\s*=\s*\$1/i);
  if (whereId && params[0]) query = query.eq('id', params[0]);

  // WHERE unidad = $1
  const whereUnidad = sql.match(/WHERE\s+unidad\s*=\s*\$1/i);
  if (whereUnidad && params[0]) query = query.eq('unidad', params[0]);

  // ORDER BY created_at DESC / id DESC
  if (sql.match(/ORDER BY\s+created_at\s+DESC/i)) query = query.order('created_at', { ascending: false });
  else if (sql.match(/ORDER BY\s+id\s+DESC/i)) query = query.order('id', { ascending: false });
  else if (sql.match(/ORDER BY\s+fecha\s+DESC/i)) query = query.order('fecha', { ascending: false });

  // LIMIT
  const limitM = sql.match(/LIMIT\s+(\d+)/i);
  if (limitM) query = query.limit(parseInt(limitM[1]));

  // COUNT
  if (sql.match(/COUNT\(\*\)/i)) {
    const countQ = supabase.from(table).select('*', { count: 'exact', head: true });
    // filtros adicionales para COUNT
    if (sql.match(/WHERE\s+estado\s*=\s*['"](urgente|pendiente|activo)['"]/i)) {
      const estadoM = sql.match(/estado\s*=\s*'([^']+)'/i);
      if (estadoM) countQ.eq('estado', estadoM[1]);
    }
    const { count, error } = await countQ;
    if (error) throw new Error(error.message);
    return { rows: [{ count: String(count || 0) }] };
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { rows: data || [] };
}

async function supabaseInsert(sql, params) {
  const table = parseTable(sql);
  if (!table) throw new Error('No se pudo parsear tabla INSERT: ' + sql);

  // Extrae columnas
  const colsM = sql.match(/\(([^)]+)\)\s+VALUES/i);
  const cols = colsM ? colsM[1].split(',').map(c => c.trim()) : [];

  const obj = {};
  cols.forEach((col, i) => {
    if (params[i] !== undefined) obj[col] = params[i];
  });

  const { data, error } = await supabase.from(table).insert(obj).select();
  if (error) throw new Error(error.message);
  return { rows: data || [] };
}

async function supabaseUpdate(sql, params) {
  const table = parseTable(sql);
  if (!table) throw new Error('No se pudo parsear tabla UPDATE: ' + sql);

  // Extrae pares SET campo = $N
  const setM = sql.match(/SET\s+(.+)\s+WHERE/i);
  const whereM = sql.match(/WHERE\s+id\s*=\s*\$(\d+)/i);

  if (!setM || !whereM) throw new Error('UPDATE no parseable: ' + sql);

  const setCols = setM[1].split(',').map(s => s.trim());
  const obj = {};
  setCols.forEach(pair => {
    const m = pair.match(/(\w+)\s*=\s*\$(\d+)/);
    if (m) obj[m[1]] = params[parseInt(m[2]) - 1];
  });

  const idIdx = parseInt(whereM[1]) - 1;
  const id = params[idIdx];

  const { data, error } = await supabase.from(table).update(obj).eq('id', id).select();
  if (error) throw new Error(error.message);
  return { rows: data || [] };
}

async function supabaseDelete(sql, params) {
  const table = parseTable(sql);
  if (!table) throw new Error('No se pudo parsear tabla DELETE: ' + sql);

  const whereM = sql.match(/WHERE\s+id\s*=\s*\$1/i);
  if (!whereM) throw new Error('DELETE sin WHERE id: ' + sql);

  const { error } = await supabase.from(table).delete().eq('id', params[0]);
  if (error) throw new Error(error.message);
  return { rows: [] };
}

function mockQuery(sql, params) {
  if (sql.includes('SELECT * FROM residentes WHERE email')) {
    return {
      rows: [
        { id: 1, nombre: 'María', apellido: 'Soto', unidad: '101', email: 'maria.soto@email.com', rol: 'residente', password: '1234' },
        { id: 2, nombre: 'Admin', apellido: 'User', unidad: 'Admin', email: 'admin@comunidad.com', rol: 'admin', password: '1234' }
      ].filter(r => r.email === params[0])
    };
  }
  if (sql.match(/COUNT/i)) return { rows: [{ count: '5' }] };
  if (sql.match(/SELECT.*FROM\s+\w+/i)) return { rows: [] };
  if (sql.match(/INSERT|UPDATE|DELETE/i)) return { rows: [{ id: 1 }] };
  return { rows: [] };
}

module.exports = pool;
