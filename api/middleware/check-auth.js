const jwt = require("jsonwebtoken");
const key = require("../../config/jwt_s_key.js");
const role = require("../user/user-role");
//This file checks for authentication, by examining the data in the JWT


module.exports = {
  userAuth: roles => {
    return (req, res, next) => {
      try {
        const token = req.headers.authorization.split(" ")[1];

        //verifies that the token has been signed with the private key located in the server
        const decoded = jwt.verify(token, key.jwt_key);

        //if the person has the correct role
        if (roles.includes(decoded.role)) {
          req.userData = decoded;
          next();
        } else {
          return res.status(401).json({
            message: "Main Authentication Failed"
          });
        }
      } catch (error) {
        return res.status(401).json({
          message: "Main Authentication Failed"
        });
      }
    };
  }
};
