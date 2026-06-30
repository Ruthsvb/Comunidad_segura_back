const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    const allowed = process.env.CORS_ORIGIN || 'http://localhost:3000';
    if (allowed === '*' || !origin || origin === allowed) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = cors(corsOptions);
