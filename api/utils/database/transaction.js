const mysql = require('mysql');
const to = require('await-to-js').default;
const util = require('util');


module.exports = class DatabaseTransaction {
  constructor(poolConn) {
    this.poolConn = poolConn;
  }

  // // Transactions need to maintain changes made across sequence of actions -- the state of every query.
  // // Thus, the need for a single connection instance.
  // // Grab a free connection instance for the connection pool.
  async init() {
    if (this.poolConn) {
      const [connErr, conn] = await to(this.poolConn.getConnection());

      if (connErr) {
        throw connErr
      }

      this.connInstance = conn;
    } else {
      this.connInstance = mysql.createConnection();
    }

    this.begin = util.promisify(this.connInstance.beginTransaction).bind(this.connInstance);
    this.query = util.promisify(this.connInstance.query).bind(this.connInstance);
    this.rollback = util.promisify(this.connInstance.rollback).bind(this.connInstance);
    this.commit = util.promisify(this.connInstance.commit).bind(this.connInstance);

    return this;
  }

  async releaseConn() {
    await this.connInstance.release();
  }

  async rollbackAndReleaseConn() {
    await this.rollback();
    await this.releaseConn();
  }
};
