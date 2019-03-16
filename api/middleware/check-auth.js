const createHttpError = require("http-errors");
const to = require("await-to-js").default;
const { auth } = require("../utils");

//This file checks for authentication, by examining the data in the JWT

module.exports = {
  userAuth: roles => {
    return async (req, res, next) => {
      //TODO MUST CHECK IF THERE IS AUTHORIZATION OR IT OUTPUTS UNDEFINED
      const token = req.headers.authorization.split(" ")[1];
      console.log("STOP 0");
      // verifies that the token has been signed with the private key located in the server
      const [error, decoded] = await to(auth.verifyAccessToken(token));

      console.log("STOP 1");

      // Emphasize token expiration error
      if (error && error.name === "TokenExpiredError") {
        return next(
          createHttpError(
            401,
            "Your access to this resource has expired. Token Expired"
          )
        );
      }
      console.log("STOP 2");

      if (!roles.includes(decoded.role)) {
        return next(
          createHttpError(
            401,
            "You need to be authorized to access this resource."
          )
        );
      }
      console.log("goes");
      req.userData = decoded;
      console.log(req.userData);

      next();
    };
  }
};
