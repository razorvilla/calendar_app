module.exports = {
    development: {
        client: 'postgresql',
        connection: {
            host: 'localhost',
            port: 5432,
            database: 'calendar_dev',
            user: 'calendar_user',
            password: 'itachi'
        },
        pool: {
            min: 2,
            max: 10,
            // Add these lines:
            afterCreate: (conn, done) => {
                conn.query('SET timezone="UTC";', function (err) {
                    done(err, conn);
                });
            }
        },

        migrations: {
            directory: './migrations'
        },
        seeds: {
            directory: './seeds'
        }
    },
    test: {
        client: 'postgresql',
        connection: {
            host: 'localhost',
            port: 5432,
            database: 'calendar_test',
            user: 'calendar_user',
            password: 'itachi'
        },
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            directory: './migrations'
        }
    }
};