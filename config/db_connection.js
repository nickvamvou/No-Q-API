var mysql = require("mysql");
const util = require("util");
var pool = mysql.createPool({
  connectionLimit: 10,
  host: "noqdatabase.cbwekgz75jvj.eu-west-2.rds.amazonaws.com",
  user: "noq_admin",
  password: "Aaa6611!!aa",
  port: 3306,
  database: "masterdb"
});
pool.getConnection((err, connection) => {
  if (err) {
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
    // var sql = "CALL create_customer(?,?)";
    // var email = "lol";
    // var password = "lolakos";
    // connection.query(sql, [email, password], (err, result) => {
    //   console.log("Result" + result);
    // });

    connection.release();
  }
  return;
});

// // Promisify for Node.js async/await.
// pool.query = util.promisify(pool.query);

module.exports = pool;
