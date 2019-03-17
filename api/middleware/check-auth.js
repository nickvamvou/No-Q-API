const createHttpError = require("http-errors");
const to = require('await-to-js').default;
const { auth } = require('../utils');
//This file checks for authentication, by examining the data in the JWT


module.exports = {
  userAuth: (roles) => {
    return async (req, res, next) => {
      const token = req.headers.authorization.split(' ')[1];

      // verifies that the token has been signed with the private key located in the server
      const [ error, decoded ] = await to(auth.verifyAccessToken(token));

      // Emphasize token expiration error
      if (error && error.name === 'TokenExpiredError') {
        return next(createHttpError(401, 'Token Expired. Your access to this resource has expired.'));
      }

      if (!roles.includes(decoded.role)) {
        return next(createHttpError(401, 'You need to be authorized to access this resource.'));
      }

      req.userData = decoded;

      next();
    };
  }
};
