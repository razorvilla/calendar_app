
const { newDb } = require('pg-mem');
const db = newDb();

const mockPg = {
  Pool: db.adapters.createPg().Pool,
};

module.exports = mockPg;
