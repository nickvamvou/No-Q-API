/*
  Controller module for customer specific actions
 */

const userRoles = require("api/constants/user_roles");
const { dbConnPool } = require('api/config');


// Log-in an Admin
exports.login = (req, res) => {
  //check if there is a user with these credential based on email
  var emailCheckSql = "CALL get_admin_password_by_email(?)";
  dbConnPool.query(emailCheckSql, [req.body.email], (err, passwordAndId) => {
    if (err) {
      res.status(500).json({
        message: "DB error"
      });
    }
    if (passwordAndId[0].length === 0) {
      console.log(passwordAndId);
      res.status(422).json({
        message: "Email or password is incorrect 1"
      });
    } else {
      //Following check for the password with db, if both passwords are same (hash and plaintext)
      module.exports
        .checkProvidedAndStoredPassword(passwordAndId, req.body.password)
        .then(acceptedPassword => {
          if (accepted) {
            var token = module.exports.createJwtToken(
              passwordAndId[0][0].uid,
              userRoles.ADMIN
            );
            //goes
            res.status(200).json({
              messsage: "Auth success",
              token: token
            });
          } else {
            return res.status(401).json({
              message: "Email or password is incorrect 2"
            });
          }
        });
    }
  });
};
