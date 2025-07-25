
const { newDb } = require('pg-mem');
const { v4: uuidv4 } = require('uuid');

let db;

beforeAll(() => {
  db = newDb();
  jest.doMock('pg', () => ({
    Pool: db.adapters.createPg().Pool,
  }));
  // Require the pg module after it has been mocked
  require('pg');
});

afterAll(() => {
  db.public.none(`
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS user_preferences CASCADE;
  `);
});
