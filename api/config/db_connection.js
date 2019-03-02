const mysql = require("mysql");
const util = require('util');


// Configure MySQL pool instance to be used API-wide.
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_SCHEMA,
});

// Release connection if coast is clear -- no errors.
pool.getConnection((err, connection) => {
  if (err) {
    if (err.code === "ENOTFOUND") {
      console.error("Database not found.");
    }
    if (err.code === 'PROTOCOL_SEQUENCE_TIMEOUT') {
      console.error('Database Handshake inactivity timeout.');
    }
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.error("Database connection was closed.");
    }
    if (err.code === "ER_CON_COUNT_ERROR") {
      console.error("Database has too many connections.");
    }
    if (err.code === "ECONNREFUSED") {
      console.error("Database connection was refused.");
    }
  }

  if (connection) {
    connection.release();
  }
});

// Promise-based version of pool.query that can be easily reused.
pool.promiseQuery = util.promisify(pool.query);


module.exports = pool;
