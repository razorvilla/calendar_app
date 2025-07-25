const request = require('supertest');
const { ApolloServer } = require('apollo-server-express');
const express = require('express');
const schema = require('../../src/schema');
const AuthAPI = require('../../src/datasources/auth-api');
const UserAPI = require('../../src/datasources/user-api');
const CalendarAPI = require('../../src/datasources/calendar-api');
const EventAPI = require('../../src/datasources/event-api');

jest.mock('../../src/datasources/user-api', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getCurrentUser: jest.fn(() => ({
        id: '123',
        email: 'test@example.com',
      })),
    };
  });
});

let app;
let server;

beforeAll(async () => {
  app = express();
  app.use(express.json());

  const getToken = (req) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return null;
  };

  const apolloServer = new ApolloServer({
    schema,
    dataSources: () => ({
      authAPI: new AuthAPI(),
      userAPI: new UserAPI(),
      calendarAPI: new CalendarAPI(),
      eventAPI: new EventAPI(),
    }),
    context: ({ req }) => ({
      token: getToken(req),
    }),
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app });

  server = app.listen(0); // Listen on a random available port
});

afterAll(async () => {
  await server.close();
});

describe('GraphQL API Gateway', () => {
  it('should execute a simple GraphQL query', async () => {
    const query = `
      query {
        me {
          id
          email
        }
      }
    `;

    const res = await request(server)
      .post('/graphql')
      .set('Authorization', 'Bearer dummy-token') // Add Authorization header
      .send({ query })
      .expect(200);

    expect(res.body.data.me).toEqual({
      id: '123',
      email: 'test@example.com',
    });
  });
});