/*
  Controller module for customer specific actions
 */

const createHttpError = require("http-errors");
const to = require('await-to-js').default;
const jwt = require("jsonwebtoken");
const util = require('util');

const userRoles = require("api/constants/user_roles");
const { SqlError } = require('api/utils');
const { dbConnPool, googleOauth2 } = require('api/config');


/**
 * This endpoint handler logs in an existing customer.
 *
 * @param req
 * @param res
 */
exports.login = (req, res) => {
  // Check if there is a user with these credential based on email
  var emailCheckSql = "CALL get_customer_password_by_email(?)";
  dbConnPool.query(emailCheckSql, [req.body.email], (err, passwordAndId) => {
    if (err) {
      res.status(500).json({
        message: "Database error"
      });
    }

    //if not return that there is no user with such credential
    else if (passwordAndId[0].length === 0) {
      res.status(422).json({
        message: "Email or password is incorrect"
      });
    } else {
      //Following check for the password with db, if both passwords are same (hash and plaintext)
      module.exports
        .checkProvidedAndStoredPassword(passwordAndId, req.body.password)
        .then(acceptedPassword => {
          if (accepted) {
            console.log(accepted);
            //create the JWT token by including the id of the user and its role for future authentication
            var token = module.exports.createJwtToken(
              passwordAndId[0][0].uid,
              userRoles.SHOPPER
            );
            //goes
            res.status(200).json({
              messsage: "Auth success",
              token: token,
              userId: passwordAndId[0][0].uid
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
 * This endpoint handler creates a new customer.
 *
 * @param req
 * @param res
 */
exports.signUp = (req, res) => {
  /**
   * Check if email exists by getting the customer id by email.
   * If zero results returned then the email is available for registration.
   */
  var emailCheckSql = "CALL get_user_id_by_email(?)";
  dbConnPool.query(emailCheckSql, req.body.email, (err, result) => {
    if (err) {
      res.status(500).json({
        message: "Account cannot be created due to database"
      });
    }

    if (result[0].length === 0) {
      module.exports.hashPassword(req.body.password).then(hashedPassword => {
        var sql = "CALL create_customer(?,?)";
        dbConnPool.query(sql, [req.body.email, hashedPassword], (err, result) => {
          if (err) {
            res.status(500).json({
              message: "Account cannot be created due to database"
            });
          } else {
            res.status(200).json({
              message: "User created"
            });
          }
        });
      });
    } else {
      res.status(422).json({
        message: "Account provided already exists"
      });
    }
  });
};


/**
 *
 * This endpoint handler completes the process of logging in a customer using google OAuth2 API by first
 * verifying `accessToken` provided by the frontend's Google Auth API or SDK, and then checking customer
 * existence -- creates customer if none is found. If all goes well, customer is issued a NoQ JWT token
 * containing customer `role` and `id` needed for future requests :)
 *
 * Alternatively flows:
 *
 * - If `accessToken` validation fails, execution is halted and google API error is forwarded to central
 *    error handler.
 *
 * - If database error occurs while checking customer existence, execution is halted and `SqlError` is
 *    forwarded to central error handler.
 *
 * - If database error occurs while creating a new customer, execution is halted and `SqlError` is forwarded
 *   to central error handler.
 *
 * - If error occurs while creating a JWT token, execution is halted and `jwtError` is forwarded to central
 *   error handler.
 *
 *
 * @param `accessToken` [String] - token to validate customer to be signed in.
 * @param `res` [Object] - Express's HTTP response object.
 * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
 *
 */
exports.loginWithGoogle = async ({ body: { accessToken } }, res, next) => {
  // Get information about passed `accessToken`. This validates the `accessToken` too.
  const [tokenLookupError, tokenInfo] = await to(googleOauth2.authClient.getTokenInfo(accessToken));

  // Error occurred while getting `accessToken` info. Forward `tokenLookupError` to central error handler.
  if (tokenLookupError) {
    return next(createHttpError(tokenLookupError));
  }

  // Validation of `accessToken` has passed. Check for customer's existence.
  const [queryError, [[existingCustomer]]] = await to(
    dbConnPool.promiseQuery('CALL get_customer_id_by_email(?)', [tokenInfo.email])
  );

  // Sadly, something bad happened while checking customer's existence. Forward `SqlError` to central error handler.
  if (queryError) {
    return next(createHttpError(new SqlError(queryError)));
  }

  // Hold `uid` for new or existing customer.
  let customerId = existingCustomer ? existingCustomer.uid : undefined;

  // Customer not found, create one!
  if (!customerId) {
    // Create new customer. `null` is passed as password because third party auth doesn't require it.
    const [queryError, queryResult] = await to(
      dbConnPool.promiseQuery('CALL create_customer(?, ?)', [tokenInfo.email, null])
    );

    // Something bad happened while creating a new customer. Forward `SqlError` to central error handler.
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    // Extract last inserted id object from query result.
    const [[lastInsertedIdObj]] = queryResult;

    // Update `customerId`, Make `id` of newly created user available to rest of method
    customerId = lastInsertedIdObj['@LID'];
  }

  // All checks passed. Everything seems good! Create JWT token containing either new or existing customer's `id` and `role`.
  const [jwtError, token] = await to(
    util.promisify(jwt.sign)({ id: customerId, role: userRoles.SHOPPER }, process.env.JWT_SALT_KEY, { expiresIn: '1h' })
  );

  // Forward JWT error to central error handler.
  if (jwtError) {
    return next(createHttpError(500, jwtError));
  }

  // Success! Send newly issued JWT token as response.
  res.status(200).json({
    message: 'You\'re now logged in with Google!',
    token
  })
};
