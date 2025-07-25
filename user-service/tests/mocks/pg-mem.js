
const { newDb } = require('pg-mem');

const db = newDb();

jest.mock('pg', () => {
  const originalPg = jest.requireActual('pg');
  return {
    ...originalPg,
    Pool: db.adapters.createPg().Pool,
  };
});

module.exports = db;
