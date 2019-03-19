const to = require('await-to-js').default;
const createHttpError = require("http-errors");

const { databaseUtil } = require('../utils');
const pool = require("../../config/db_connection");


exports.startDbTransaction = async (req, res, next) => {
  let { dbTransactionInstance } = res.locals;

  if (dbTransactionInstance) {
    return next();
  }

  let initError;

  [ initError, dbTransactionInstance ] = await to(new databaseUtil.DatabaseTransaction(pool).init());

  if (initError) {
    return next(createHttpError(initError));
  }

  // Begin new database transaction.
  const [ beginTransErr ] = await to(dbTransactionInstance.begin());

  // Error starting database transaction. Forward error!
  if (beginTransErr) {
    return next(createHttpError(beginTransErr));
  }

  res.locals.dbTransactionInstance = dbTransactionInstance;

  next();
};

exports.endDbTransaction = async (req, res, next) => {
  const { dbTransactionInstance, finalResponse } = res.locals;

  if (!dbTransactionInstance) {
    return next();
  }

  // Make database changes so far persistent. Commit it!
  const [ commitErr ] = await to(dbTransactionInstance.commit());

  // If error occurs while persisting changes, rollback!
  if (commitErr) {
    await dbTransactionInstance.rollback();
  }

  // Finally, DB connection has served its purpose. Release it back into the pool.
  await dbTransactionInstance.releaseConn();

  if (finalResponse) {
    return res.json(finalResponse)
  }

  res.status(204).send();
};
