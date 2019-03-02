/*
  Controller module for retailer specific actions
 */

const createHttpError = require("http-errors");
const to = require('await-to-js').default;

const { SqlError } = require('api/utils');
const { dbConnPool } = require('api/config');


// Log-in a Retailer
exports.login = (req, res) => {
  //check if there is a user with these credential based on email
  var emailCheckSql = "CALL get_retailer_password_by_email(?)";
  dbConnPool.query(emailCheckSql, [req.body.email], (err, passwordAndId) => {
    if (err) {
      res.status(500).json({
        message: "DB error"
      });
    } else if (passwordAndId[0].length === 0) {
      res.status(422).json({
        message: "Email or password is incorrect"
      });
    } else {
      //Following check for the password with db, if both passwords are same (hash and plaintext)
      module.exports
        .checkProvidedAndStoredPassword(passwordAndId, req.body.password)
        .then(acceptedPassword => {
          if (accepted) {
            var token = module.exports.createJwtToken(
              passwordAndId[0][0].uid,
              userRoles.RETAILER
            );
            //goes
            res.status(200).json({
              messsage: "Auth success",
              token: token
            });
          } else {
            return res.status(401).json({
              message: "Email or password is incorrect"
            });
          }
        });
    }
  });
};


/**
 * Sign-up a Retailer with a hashed password.
 * Accepts (email, password, companyName, brandName).
 */
exports.signUp = (req, res) => {
  var emailCheckSql = "CALL get_user_id_by_email(?)";
  dbConnPool.query(emailCheckSql, [req.body.email], (err, result) => {
    if (err) {
      res.status(500).json({
        message: "Account cannot be created due to database"
      });
    } else if (result[0].length === 0) {
      module.exports.hashPassword(req.body.password).then(hashedPassword => {
        var sql = "CALL create_retailer(?,?,?,?)";
        dbConnPool.query(
          sql,
          [
            req.body.email,
            hashedPassword,
            req.body.companyName,
            req.body.brandName
          ],
          (err, result) => {
            if (err) {
              res.status(500).json({
                message: "Account cannot be created due to db"
              });
            } else {
              res.status(200).json({
                message: "User created"
              });
            }
          }
        );
      });
    } else {
      res.status(422).json({
        message: "Email provided already exists"
      });
    }
  });
};


/**
 *  This request handler initiates the process of resetting password for a retailer.
 *
 * @param req - express request object containing information about the request
 * @param res - express response object
 * @param next - function that forwards processes to the next express handler or middleware
 */
exports.initiatePassReset = async (req, res, next) => {
  const { body: { email } } = req;

  // Issue query to get retailer info
  const [queryError, [[{ uid, brand_name }]]] = await to(dbConnPool.promiseQuery("CALL get_retailer_details_by_email(?)", [email]));

  // Forward fatal error to global error handler
  if (queryError) {
    return next(createHttpError(new SqlError(queryError)));
  }

  // If no retailer is found, forward a 404 HTTP error to the global error handler.
  if (!uid) {
    return next(createHttpError(
      404, `Unfortunately, '${email}' is not associated with any account.`
    ));
  }

  // Save brand name as a reference name to be used by the next handler.
  req.locals.referenceName = brand_name;

  // Pass control to next handler.
  next();
};
