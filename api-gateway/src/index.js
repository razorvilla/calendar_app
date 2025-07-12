require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const jwt = require('jsonwebtoken');
const typeDefs = require('./schema/typeDefs');
const resolvers = require('./resolvers');

// Data Sources
const AuthAPI = require('./datasources/auth-api');
const UserAPI = require('./datasources/user-api');
const CalendarAPI = require('./datasources/calendar-api');
const EventAPI = require('./datasources/event-api');

async function startServer() {
    // Create Express app
    const app = express();

    // Apply middleware
    app.use(cors());
    app.use(express.json());
    app.use(cookieParser());

    // Basic request logger
    app.use((req, res, next) => {
        console.log(`API Gateway: Incoming request - ${req.method} ${req.url}`);
        next();
    });

    // Extract token from request
    const getToken = (req) => {
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7);
        }
        return null;
    };

    // Create Apollo Server
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        dataSources: () => ({
            authAPI: new AuthAPI(),
            userAPI: new UserAPI(),
            calendarAPI: new CalendarAPI(),
            eventAPI: new EventAPI(),
        }),
        context: ({ req, res }) => {
            console.log('API Gateway: GraphQL context received request body:', req.body);
            const token = getToken(req);
            let userId = null;
            if (token) {
                try {
                    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
                    userId = decodedToken.userId;
                } catch (error) {
                    console.error('Error decoding token:', error.message);
                }
            }
            return { req, res, token, userId };
        },
        introspection: process.env.NODE_ENV !== 'production',
        playground: process.env.NODE_ENV !== 'production',
    });

    await server.start();

    // Apply Apollo middleware to Express
    server.applyMiddleware({ app });

    // Re-add the /graphql route handler
    app.post('/graphql', (req, res, next) => {
        console.log('API Gateway: Received GraphQL request.');
        console.log('API Gateway: GraphQL request body:', req.body);
        next();
    });

    // Start server
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`🚀 GraphQL API ready at http://localhost:${PORT}${server.graphqlPath}`);
    });
}

startServer().catch(error => {
    console.error('Error starting server:', error);
});