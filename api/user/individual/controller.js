/*
  Controller module for individual specific actions
 */

const createHttpError = require("http-errors");
const to = require('await-to-js').default;

const { SqlError } = require('api/utils');
const { dbConnPool } = require('api/config');


/**
 * This particular method initiates the process of resetting password for an individual user.
 *
 * @param req - express request object containing information about the request
 * @param res - express response object
 * @param next - function that forwards processes to the next express handler or middleware
 */
exports.initiateIndividualPassReset = async (req, res, next) => {
  const { body: { email } } = req;

  // Issue query to check individual existence and get info.
  const [queryError, [[{ uid, first_name }]]] = await to(
    dbConnPool.promiseQuery('CALL get_individual_details_by_email(?)', [email])
  );

  // Database error happened. Forward error to central error handler.
  if (queryError) {
    return next(createHttpError(500, new SqlError(queryError)));
  }

  // No matching user found. Halt execution and forward error.
  if (!uid) {
    return next(createHttpError(
      404, `Unfortunately, '${email}' is not associated with any account.`
    ));
  }

  // Save individual's first name as a reference name to be used by the next handler.
  req.locals.referenceName = first_name;

  // Pass control to next handler.
  next();
};
