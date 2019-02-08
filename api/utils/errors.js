class BaseError extends Error {
  constructor(...args) {
    super(...args);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (BaseError.captureStackTrace) {
      BaseError.captureStackTrace(this, BaseError);
    }
  }
}

class SqlError extends BaseError {
  constructor({ sqlMessage }) {
    super(sqlMessage);
  }
}


module.exports = {
  SqlError,
};
