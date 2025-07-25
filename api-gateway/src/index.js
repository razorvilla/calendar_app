require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const schema = require('./schema');
const AuthAPI = require('./datasources/auth-api');
const UserAPI = require('./datasources/user-api');
const CalendarAPI = require('./datasources/calendar-api');
const EventAPI = require('./datasources/event-api');

async function startServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    const getToken = (req) => {
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7);
        }
        return null;
    };

    const server = new ApolloServer({
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
        introspection: process.env.NODE_ENV !== 'production',
        playground: process.env.NODE_ENV !== 'production',
    });

    await server.start();
    server.applyMiddleware({ app });

    const PORT = process.env.PORT || 4000;
    const PORT = process.env.PORT || 4000;
    const serverInstance = app.listen(PORT, () => {
        console.log(`🚀 GraphQL API ready at http://localhost:${PORT}${server.graphqlPath}`);
    });

    return app;
}

startServer().catch(error => {
    console.error('Error starting server:', error);
});

module.exports = startServer();