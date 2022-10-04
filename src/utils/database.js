const mariadb = require('mariadb');

// Create pool of connections to pick from. This should make connecting a little bit faster.
const connection = mariadb.createPool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    connectionLimit: process.env.DB_POOL_LIMIT,
});

module.exports = {
    connection
};