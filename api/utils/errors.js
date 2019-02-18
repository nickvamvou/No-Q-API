/*
 * Error constructors
 *
 * This module contains classes responsible
 * for creating and augmenting specific errors
 * within the application. This is to ensure that
 * errors conform to the native standard.
 *
 * Each specific error inherits from `BaseError`
 * which in turn inherits from the JS native `Error`
 * class.
 *
 */

const statusCodes = require('statuses');

/**
 * Error class that describes all other
 * custom error classes.
 */
class BaseError extends Error {
  constructor(...args) {
    super(...args);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (BaseError.captureStackTrace) {
      BaseError.captureStackTrace(this, BaseError);
    }
  }
}

/**
 * Error class from creating SQL errors.
 */
class SqlError extends BaseError {
  constructor({ sqlMessage, sqlState }) {
    super(sqlMessage);

    this.statusCode = SqlError.deriveHttpStatusCodeFromSqlStateCode(sqlState);
  }

  static deriveHttpStatusCodeFromSqlStateCode(sqlState) {
    switch (sqlState) {
      case '42506':
        return statusCodes.Forbidden;
      default:
        return statusCodes['Internal Server Error'];
    }
  }
}


module.exports = {
  SqlError,
};
