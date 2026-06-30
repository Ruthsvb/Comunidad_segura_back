const { Pool } = require('pg');
require('dotenv').config();

let pool;

// Mock mode si no hay conexión a BD real
const MOCK_MODE = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost');

if (MOCK_MODE) {
  console.log('⚠️  Mock mode: sin conexión a BD real');
  // Mock pool que simula queries
  pool = {
    query: async (sql, params) => {
      // Simulaciones hardcoded para auth y datos
      if (sql.includes('SELECT * FROM residentes WHERE email')) {
        return {
          rows: [
            { id: 1, nombre: 'María', apellido: 'Soto', unidad: '101', email: 'maria.soto@email.com', rol: 'residente', telefono: '912345678', fecha_ingreso: '2025-01-01' },
            { id: 2, nombre: 'Admin', apellido: 'User', unidad: 'Admin', email: 'admin@comunidad.com', rol: 'admin', telefono: '', fecha_ingreso: '2025-01-01' }
          ].filter(r => r.email === params[0])
        };
      }
      if (sql.includes('SELECT COUNT(*) as count FROM residentes')) {
        return { rows: [{ count: '8' }] };
      }
      if (sql.includes('tickets_mantencion') && sql.includes('COUNT')) {
        return { rows: [{ count: '8', urgentes: '4' }] };
      }
      if (sql.includes('reservas') && sql.includes('COUNT')) {
        return { rows: [{ count: '8' }] };
      }
      if (sql.includes('reclamos') && sql.includes('COUNT')) {
        return { rows: [{ count: '6' }] };
      }
      if (sql.includes('gastos_comunes') && sql.includes('COUNT')) {
        return { rows: [{ count: '6' }] };
      }

      // Mock INSERT/UPDATE retornan success
      if (sql.includes('INSERT') || sql.includes('UPDATE') || sql.includes('DELETE')) {
        return { rows: [{ id: Math.random(), ...params.reduce((a, v, i) => ({ ...a, [`param${i}`]: v }), {}) }] };
      }

      return { rows: [] };
    }
  };
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  pool.on('error', (err) => {
    console.error('Pool error:', err);
  });
}

module.exports = pool;
