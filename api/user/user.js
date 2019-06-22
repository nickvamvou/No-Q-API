//This defines the user controller
const createHttpError = require("http-errors");
const path = require("path");
const bcrypt = require("bcrypt");
const to = require("await-to-js").default;
const util = require("util");
const pool = require("../../config/db_connection");
const cacheRegister = require("../../config/cache_register");
const mailer = require("../../config/mailer");
const { googleOAuth2Client } = require("../../config/google_auth");
const role = require("./user-role");
const jwt = require("jsonwebtoken");
const key = require("../../config/jwt_s_key");
const { SqlError, password, auth } = require("../utils");
const { initiateResetPassword } = require("./helpers");
const moment = require("moment");

module.exports = {
  checkUserExistence: async ({ body: { email } }, res, next) => {
    const [error, result] = await to(
      pool.promiseQuery("CALL get_user_id_by_email(?)", [email])
    );

    if (error) {
      return next(createHttpError(new SqlError(error)));
    }

    const [[user]] = result;

    if (user) {
      return next(
        createHttpError(
          409,
          "Looks like you already created an account. Please login to continue."
        )
      );
    }

    next();
  },

  createHashedPass: async (
    { body: { password: plainTextPass } },
    res,
    next
  ) => {
    const [error, hash] = await to(password.hashPassword(plainTextPass));

    if (error) {
      return next(createHttpError(error));
    }

    res.locals.hashPassword = hash;

    next();
  },

  createShopper: async ({ body: { email } }, res, next) => {
    const { hashPassword } = res.locals;

    const [error, result] = await to(
      pool.promiseQuery("CALL create_customer(?, ?)", [email, hashPassword])
    );

    if (error) {
      return next(createHttpError(new SqlError(error)));
    }

    // Extract last inserted id object from query result.
    const [[lastInsertedIdObj]] = result;

    const userId = lastInsertedIdObj["@LID"];

    res.locals.role = role.SHOPPER;
    res.locals.userId = userId;

    next();
  },

  createRetailer: async (
    { body: { email, companyName, brandName } },
    res,
    next
  ) => {
    const { hashPassword } = res.locals;

    const [error, result] = await to(
      pool.promiseQuery("CALL create_retailer(?, ?, ?, ?)", [
        email,
        hashPassword,
        companyName,
        brandName
      ])
    );

    if (error) {
      return next(createHttpError(new SqlError(error)));
    }

    // Extract last inserted id object from query result.
    const [[lastInsertedIdObj]] = result;

    const userId = lastInsertedIdObj["@LID"];

    res.locals.role = role.RETAILER;
    res.locals.userId = userId;

    next();
  },

  // Log-in a Shopper
  getShopperPassIfExists: async (
    { body: { email, password: providedPass } },
    res,
    next
  ) => {
    // Check if there is a user with these credential based on email
    const [queryError, queryResult] = await to(
      pool.promiseQuery("CALL get_customer_password_by_email(?)", [email])
    );

    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    const [[{ uid: userId, password: hashedPass, ...user } = {}]] = queryResult;

    if (!userId) {
      return next(
        createHttpError(
          404,
          "Sorry but it looks like you don't have an account with us yet."
        )
      );
    }

    res.locals.userId = userId;
    res.locals.user = { ...user, uid: userId };
    res.locals.hashedPass = hashedPass;
    res.locals.providedPass = providedPass;
    res.locals.role = role.SHOPPER;

    next();
  },

  // Log-in a Retailer
  getRetailerPassIfExists: async (req, res, next) => {
    const {
      body: { email, password: providedPass }
    } = req;

    // Check if there is a user with these credential based on email
    const [queryError, queryResult] = await to(
      pool.promiseQuery("CALL get_retailer_password_by_email(?)", [email])
    );

    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    const [[{ uid: userId, password: hashedPass } = {}]] = queryResult;

    if (!userId) {
      return next(
        createHttpError(
          404,
          "Sorry but it looks like you don't have an account with us yet."
        )
      );
    }

    res.locals.userId = userId;
    res.locals.hashedPass = hashedPass;
    res.locals.providedPass = providedPass;
    res.locals.role = role.RETAILER;

    next();
  },

  // Log-in an Admin
  getAdminPassIfExists: async (req, res, next) => {
    const {
      body: { email, password: providedPass }
    } = req;

    const [queryError, queryResult] = await to(
      pool.promiseQuery("CALL get_admin_password_by_email(?)", [email])
    );

    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    const [[{ uid: userId, password: hashedPass } = {}]] = queryResult;

    if (!userId) {
      return next(
        createHttpError(
          404,
          "Sorry but it looks like you don't have an account with us yet."
        )
      );
    }

    res.locals.userId = userId;
    res.locals.hashedPass = hashedPass;
    res.locals.providedPass = providedPass;
    res.locals.role = role.ADMIN;

    next();
  },

  checkPassCorrectness: async (req, res, next) => {
    const { providedPass, hashedPass } = res.locals;

    const [error, isCorrect] = await to(
      password.checkPassCorrectness(providedPass, hashedPass)
    );

    if (error) {
      return next(createHttpError(error));
    }

    if (!isCorrect) {
      return next(
        createHttpError(
          401,
          "There seems to be an issue with you password. Please ensure you're putting in the right password/"
        )
      );
    }

    next();
  },

  createRefreshToken: async (req, res, next) => {
    const { userId, role } = res.locals;

    const [error, token] = await to(
      auth.createRefreshToken({ id: userId, role })
    );

    if (error) {
      return next(createHttpError(error));
    }

    res.locals.refreshToken = token;

    next();
  },

  createAccessToken: async (req, res, next) => {
    const { userId, role } = res.locals;
    const [error, token] = await to(
      auth.createAccessToken({ id: userId, role })
    );
    if (error) {
      return next(createHttpError(error));
    }

    res.locals.accessToken = token;

    next();
  },

  sendAuthResponse: (req, res) => {
    const { refreshToken, accessToken, user } = res.locals;

    res.json({
      refreshToken,
      accessToken,
      user
    });
  },

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
  loginCustomerWithGoogle: async ({ body: { accessToken } }, res, next) => {
    // Get information about passed `accessToken`. This validates the `accessToken` too.
    const [tokenLookupError, tokenInfo] = await to(
      googleOAuth2Client.getTokenInfo(accessToken)
    );

    // Error occurred while getting `accessToken` info. Forward `tokenLookupError` to central error handler.
    if (tokenLookupError) {
      return next(createHttpError(tokenLookupError));
    }

    // Validation of `accessToken` has passed. Check for customer's existence.
    const [queryError, [[existingCustomer]]] = await to(
      pool.promiseQuery("CALL get_individual_details_by_email(?)", [tokenInfo.email])
    );

    // Sadly, something bad happened while checking customer's existence. Forward `SqlError` to central error handler.
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    // Hold new or existing customer.
    let customer = existingCustomer;

    // Customer not found, create one!
    if (!customer) {
      // Create new customer. `null` is passed as password because third party auth doesn't require it.
      const [queryError, queryResult] = await to(
        pool.promiseQuery("CALL create_customer(?, ?)", [tokenInfo.email, null])
      );

      // Something bad happened while creating a new customer. Forward `SqlError` to central error handler.
      if (queryError) {
        return next(createHttpError(new SqlError(queryError)));
      }

      // Extract last inserted id object from query result.
      const [[newlyCreatedCustomer]] = queryResult;

      // Update `customerId`, Make `id` of newly created user available to rest of method
      customer = newlyCreatedCustomer;
    }

    // Success! Send newly issued JWT token as response.
    res.status(200).json({
      accessToken: await  auth.createAccessToken({ id: customer.uid, role: role.SHOPPER }),
      refreshToken: await auth.createRefreshToken({ id: customer.uid, }),
      user: customer,
    });
  },

  /**
   *
   *
   * The particular method updates the details of the user
   *
   * @param firstname
   * @param lastname
   * @param birthday
   * @return Whether the update was successful or not
   * @throws Error (500) System Failure.

   */

  updateUserDetails: async (req, res, next) => {
    // var authorized = module.exports.checkAuthorization(
    //   req.params.userId,
    //   req.userData.id,
    //   req.userData.role
    // );

    authorized = true;
    if (authorized) {
      try {
        await module.exports.updateDetails(
          req.params.userId,
          req.body.firstname,
          req.body.lastname,
          req.body.dob
        );
        return res.status(200).json({
          messsage: "Details were updated"
        });
      } catch (err) {
        return res.status(500).json({
          messsage: "Could not update the profile details"
        });
      }
    } else {
      res.status(401).json({
        message: "User not authorized"
      });
    }
  },
  // getStores: async (req, res, next) => {
  //   const getStoresFromDB = "CALL get_all_stores(?, ?)";
  //
  //   const [queryError, queryResult] = await to(
  //     pool.promiseQuery(deleteProductFromUserCartDB, [product_id, cart_id])
  //   );
  //   //get any possible error
  //   if (queryError) {
  //     return queryError;
  //   }
  //   return queryResult;
  // },

  /**
   *
   *
   * The particular method retrieves all the vouchers of a user
   *
   * @return Vouchers of a user
   * @throws Error (500) System Failure.

   */

  getUserVouchers: async (req, res, next) => {
    //check that the user has access to the vouchers he/she is requesting
    // var authorized = module.exports.checkAuthorization(
    //   req.params.userId,
    //   req.userData.id,
    //   req.userData.role
    // );
    authorized = true;
    if (authorized) {
      try {
        //retrieve the vouchers of the user
        var userVouchers = await module.exports.getVouchersFromUser(
          req.params.userId
        );
        return res.status(200).json({
          vouchers: userVouchers
        });
      } catch (err) {
        console.log(err);
        return res.status(500).json({
          messsage: "Could not retrieve users voucher",
          error: err
        });
      }
    } else {
      res.status(401).json({
        message: "User not authorized"
      });
    }
  },

  /**
   *
   *
   * The particular method retrieves all the vouchers of a user
   *
   * @return Vouchers of a user
   * @throws Error (500) System Failure.

   */

  //add voucher to user

  /*
  ******************************************************************************
                            Edit/Delete Functions
  ******************************************************************************
  */
  /**
   * Change the password of the user.
   * Accepts: (oldPassword, newPassword).
   */
  changePassword: (req, res, next) => {
    //checking that the user that wants to change the password has authorization
    var authorized = module.exports.checkAuthorization(
      req.params.userId,
      req.userData.id,
      req.userData.role
    );
    //users must provide their old passwords
    if (authorized) {
      var oldPasswordCheck = "CALL get_user_password_by_id(?)";
      pool.query(
        oldPasswordCheck,
        [req.params.userId],
        (err, passwordEncrypted) => {
          //checks if username exists
          if (err) {
            res.status(422).json({
              message: "Old password could not be fetched"
            });
          } else {
            console.log("Password passwordEncrypted : " + passwordEncrypted[0]);
            module.exports
              .checkProvidedAndStoredPassword(
                passwordEncrypted,
                req.body.oldPassword
              )
              .then(acceptedPassword => {
                //old password matches with provided
                if (acceptedPassword) {
                  module.exports
                    .hashPassword(req.body.newPassword)
                    .then(hashedPassword => {
                      if (hashedPassword !== undefined) {
                        console.log("vroum : " + hashedPassword);
                        //we do not check if there is user with this id because we have issued a JWT token for this id
                        var changePasswordSql =
                          "CALL change_user_password_by_id(?,?)";
                        pool.query(
                          changePasswordSql,
                          [req.params.userId, hashedPassword],
                          (err, result) => {
                            console.log("HASH : " + hashedPassword);
                            if (err) {
                              res.status(400).json({
                                message: "Could not update password"
                              });
                            } else {
                              res.status(200).json({
                                message: "Password Changed",
                                user: req.params.userId
                              });
                            }
                          }
                        );
                      } else {
                        res.status(400).json({
                          message: "Could not hash password"
                        });
                      }
                    });
                }
                //old password was not accepted
                else {
                  res.status(406).json({
                    message:
                      "Password provided does not match with old password"
                  });
                }
              });
          }
        }
      );
    } else {
      res.status(401).json({
        message: "User not authorized"
      });
    }
  },

  /**
   * Allow Admins to change user passwords.
   * Accepts: (newPassword).
   */
  changePasswordAdmin: (req, res, next) => {
    var passwordChange = {
      userId: req.params.userId,
      newPassword: req.body.newPassword
    };
    module.exports
      .hashPassword(passwordChange.newPassword)
      .then(hashedPassword => {
        //we do not check if there is user with this id because the admin can change every password
        var changePasswordSql = "CALL change_user_password_by_id(?,?)";
        pool.query(
          changePasswordSql,
          [passwordChange.userId, hashedPassword],
          (err, result) => {
            if (err) {
              res.status(400).json({
                message: "Could not update password"
              });
            } else {
              res.status(200).json({
                message: "Password Changed",
                user: req.params.userId
              });
            }
          }
        );
      });
  },

  // Delete user from database.
  deleteUser: (req, res, next) => {
    //delete the particular user from db
    var authorized = module.exports.checkAuthorization(
      req.params.userId,
      req.userData.id,
      req.userData.role
    );

    if (authorized) {
      var sql = "CALL delete_user_by_id(?)";
      var id = req.userData.id;
      pool.query(sql, id, (err, result) => {
        if (err) {
          //user not found
          res.status(400).json({
            message: "User to delete not found"
          });
        } else {
          res.status(200).json({
            message: "User deleted",
            user: req.params.userId
          });
        }
      });
    } else {
      return res.status(401).json({
        message: "Authentication Failed"
      });
    }
  },

  /**
   *
   *
   * The particular method returns the users details
   *
   *
   * @return Whether the addition of the voucher is successful
   * @throws Error (500) System Failure.
             Error (404) item not found in Users Cart.
            Error (404) cart not found.
   */
  getUserDetails: async (req, res, next) => {
    // var authorized = module.exports.checkAuthorization(
    //   req.params.userId,
    //   req.userData.id,
    //   req.userData.role
    // );
    var authorized = true;
    if (authorized) {
      await module.exports
        .getUserDetailsFromDb(req.params.userId)
        .then(userDetails => {
          res.status(200).json({
            message: "User details retrieved",
            user: userDetails
          });
        })
        .catch(err => {
          res.status(500).json({
            message: "Could not retrieve user details"
          });
        });
    } else {
      return res.status(401).json({
        message: "Authentication Failed"
      });
    }
  },

  /**
   *  This particular method initiates the process of resetting password for a customer.
   *  TODO: Refactor messaging and endpoint to show that this method can work for any individual user
   *
   * @param req - express request object containing information about the request
   * @param res - express response object
   * @param next - function that forwards processes to the next express handler or middleware
   */
  initiateIndividualPassReset: async (req, res, next) => {
    const {
      body: { email }
    } = req;
    const individualUserQuery = "CALL get_individual_details_by_email(?)";
    const [queryError, queryResult] = await to(
      pool.promiseQuery(individualUserQuery, [email])
    );

    if (queryError) {
      return next(createHttpError(500, new SqlError(queryError)));
    }

    // Retrieve actual result set from query result
    const [resultSet] = queryResult;

    if (!resultSet.length) {
      return next(
        createHttpError(
          404,
          `Unfortunately, '${email}' is not associated with any account.`
        )
      );
    }

    const [{ first_name }] = resultSet;

    // Save individual's first name as a reference name to be used by the `initiateResetPassword` helper/base function
    req.referenceName = first_name;

    // Pass control to `initiateResetPassword` which holds similar processes across multiple user types
    initiateResetPassword(req, res, next);
  },

  /**
   *  This particular method initiates the process of resetting password for a retailer.
   *
   * @param req - express request object containing information about the request
   * @param res - express response object
   * @param next - function that forwards processes to the next express handler or middleware
   */
  initiateRetailerPassReset: async (req, res, next) => {
    const {
      body: { email }
    } = req;

    // Issue query to get retailer info
    const [queryError, queryResult] = await to(
      pool.promiseQuery("CALL get_retailer_details_by_email(?)", [email])
    );

    // Forward fatal error to global error handler
    if (queryError) {
      return next(createHttpError(500, new SqlError(queryError)));
    }

    // Get nested array which contains the actual result set
    const [resultSet] = queryResult;

    // If no retailer is found, forward a 404 HTTP error to the global error handler
    if (!resultSet.length) {
      return next(
        createHttpError(
          404,
          `Unfortunately, '${email}' is not associated with any account.`
        )
      );
    }

    // Retrieve retailer's brand name
    const [{ brand_name }] = resultSet;

    // Save brand name as a reference name to be used by the `initiateResetPassword` helper/base function
    req.referenceName = brand_name;

    // Pass control to `initiateResetPassword` which holds similar processes across multiple user types
    initiateResetPassword(req, res, next);
  },

  /**
   *  This particular method resets password for any user type;
   *  provided that the process has being initiated not more than an hour
   *  before doing this.
   *
   * @param req - express request object containing information about the request
   * @param res - express response object
   * @param next - function that forwards processes to the next express handler or middleware
   */
  resetPassword: async (
    { body: { token: forgotPassToken, newPassword } },
    res,
    next
  ) => {
    // Attempt to Verify token. If successful, returns decoded data with user's email ana other info
    const [jwtError, decodedData] = await to(
      util.promisify(jwt.verify)(forgotPassToken, key.jwt_key)
    );

    // Forward fatal error to global error handler
    if (jwtError) {
      return next(createHttpError(500, jwtError));
    }

    // Token is not available anymore, probably expired, invalid, or doesn't meet same conditions as when created
    if (!decodedData) {
      return next(createHttpError(404, "Token not available"));
    }

    const { email, referenceName } = decodedData;

    // Retrieve copy of token saved in cache register for authentication and validation.
    const [cacheRegisterErr, token] = await to(
      cacheRegister.get(`forgot-pass-token-${email}`)
    );

    // Forward fatal error to global error handler
    if (cacheRegisterErr) {
      return next(createHttpError(500, cacheRegisterErr));
    }

    // Token doesn't match. Someone is playing games! Halt process here.
    if (token !== forgotPassToken) {
      return next(
        createHttpError(400, "Provided token doesn't match saved token")
      );
    }

    // Encrypt new password
    const [passHashErr, hashedPass] = await to(
      module.exports.hashPassword(newPassword)
    );

    // Forward fatal error to global error handler
    if (passHashErr) {
      return next(createHttpError(500, passHashErr));
    }

    // Issue query to DB to update user password
    const [userQueryError] = await to(
      pool.promiseQuery(`CALL change_user_password_by_email(?, ?)`, [
        email,
        hashedPass
      ])
    );

    // Forward fatal error to global error handler
    if (userQueryError) {
      return next(createHttpError(500, new SqlError(userQueryError)));
    }

    // Configure mailer options
    const mailOptions = {
      to: email,
      from: "no-q@info.io",
      template: "password-reset-success",
      subject: "Your password has been changed successfully",
      context: {
        name: referenceName
      }
    };

    // Send email using Nodemailer's SMTP transport
    const [mailerError] = await to(mailer.sendEmail(mailOptions));

    // Forward fatal error to global error handler
    if (mailerError) {
      return next(createHttpError(500, mailerError));
    }

    // Dish out success message :)
    return res.status(200).json({
      message: "Your password has been changed successfully"
    });
  },

  /**
   * This particular method renders a reset password form
   *
   * @param req - express request object containing information about the request
   * @param res - express response object
   */
  renderPassResetForm: async (req, res) => {
    // Send static HTML file.
    res.sendFile(path.resolve("./public/templates/reset-password.html"));
  },

  /**
   *
   *
   * The particular method adds a voucher to the user by getting the voucher code
   *
   * @param VoucherCode
   *
   * @return Whether the addition of the voucher is successful
   * @throws Error (500) System Failure.
             Error (404) item not found in Users Cart.
            Error (404) cart not found.
   */
  addVoucher: async (req, res, next) => {
    //get the voucher details and check whether its redeemable (if not throw error)
    var voucherDetails = await module.exports.checkIfVoucherIsRedeemable(
      req.body.voucherCode
    );

    if (voucherDetails instanceof Error) {
      console.log("error");

      return res.status(500).json({
        message: "DB error or voucher is not redeembale"
      });
    }

    const [{ coupon_id }] = voucherDetails;

    var added = await module.exports.addVoucherToUser(
      req.params.userId,
      coupon_id
    );

    if (added instanceof Error) {
      return res.status(500).json({
        message: "Could not add voucher to user"
      });
    }

    return res.status(200).json({
      message: "Voucher was added to user",
      voucher: voucherDetails
    });
  },

  addVoucherToUser: async (userId, voucherId) => {
    var addVoucherToUserProcedure = "CALL add_voucher_to_user(?, ?, ?)";

    const [queryError, queryResult] = await to(
      pool.promiseQuery(addVoucherToUserProcedure, [
        moment(new Date()).format("YYYY-MM-DD"),
        userId,
        voucherId
      ])
    );

    //get any possible error
    if (queryError) {
      console.log(queryError);
      return queryError;
    }

    if (queryResult.affectedRows === 0) {
      console.log("error empty rows");
      return new Error();
    }

    return queryResult;
  },

  getPreviousPurchases: async (req, res, next) => {
    //TODO implement authorization

    var purchases = await module.exports.getPreviousPurchasesDB(
      req.params.userId
    );

    if (purchases instanceof Error) {
      return res.status(500).json({
        message: purchases
      });
    }
    return res.status(200).json({
      purchases: purchases
    });
  },

  filterCartProductsWithOptions: cart_with_products => {
    console.log("hello : " + cart_with_products);
    var filtered_cart = [];
    var product_ids_visited = [];

    var current_product = {};

    for (product_detail_entry of cart_with_products) {
      if (!product_ids_visited.includes(product_detail_entry.product_id)) {
        filtered_cart.push(current_product);
        product_ids_visited.push(product_detail_entry.product_id);
        current_product = product_detail_entry;
      } else {
        current_product.option_value =
          current_product.option_value +
          "," +
          product_detail_entry.option_value;

        current_product.option_group_name =
          current_product.option_group_name +
          "," +
          product_detail_entry.option_group_name;
      }
    }

    //TODO (DO NOT REMOVE THE FIRS ENTRY LIKE THAT)

    filtered_cart.push(current_product);

    filtered_cart = filtered_cart.slice(1);

    return filtered_cart;

    // //get all the product details, option values and option groups for 1 product
    // for (i = 0; i < cart_with_products.length; i++) {
    //   //get all the product detail information
    //   for (var property in cart_with_products[i]) {
    //     if (property !== "product_id") {
    //       if (product_id_visited.includes(cart_with_products[i][property])) {
    //         continue;
    //       }
    //     }
    //     if (property !== "option_value" && property !== "option_group_name") {
    //       individual_product_details[property] =
    //         cart_with_products[i][property];
    //     }
    //     //loop through the array of values
    //     else {
    //       //we loop through the option values and add them to individual product details
    //       if (property === "option_value") {
    //         for (var option_value in cart_with_products[i][property]) {
    //           indiviual_values.push(cart_with_products[i].option_value);
    //           console.log("stop");
    //         }
    //       }
    //       //we loop through the option group and add them to individual product details
    //       else {
    //         for (var option_group in cart_with_products[i][property]) {
    //           individual_group_names.push(
    //             cart_with_products[i].option_group_name
    //           );
    //         }
    //       }
    //     }
    //   }
    //   product_id_visited.push(cart_with_products[i]["product_id"]);
    //   //add the group names and values to the product Details
    //   individual_product_details["option_values"] = indiviual_values;
    //   individual_product_details["option_group_names"] = individual_group_names;
    //
    //   //add the product details object to the array
    //   transformed_cart.push(individual_product_details);
    //   individual_product_details = {};
    //   var indiviual_values = [];
    //   var individual_group_names = [];
    // }
  },

  /**
   * Endpoint: `GET user/:userId/purchases/:purchaseId`
   * Primary actors: [ Customer ]
   * Secondary actors: None
   *
   * This endpoint handler retrieves details
   * of a previous order.
   *
   * Alternative flows:
   *
   * - If error occurs while getting store orders from the database,
   *   halt process and forward database error to central error handler.
   *
   * @param `purchaseId` [Number] - `id` of the purchase.
   *
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   */

  getPreviousPurchase: async (
    { params: { purchaseId }, userData: { id: customerId } },
    res,
    next
  ) => {
    // Issue query to get details of a customer purchase.
    let [queryError, queryResult] = await to(
      pool.promiseQuery(
        "call get_details_of_previous_purchase_as_customer(?,?)",
        [purchaseId, customerId]
      )
    );

    // Forward query error to central error handler.
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    const [rows] = queryResult;

    if (!rows.length) {
      return next(createHttpError(404, 'Purchase not found'));
    }

    const [ { products, ...rest } ] = rows;

    res.json({
      data: { ...rest, products: JSON.parse(products) }, // Parse products to get rid of back slashes.
    });
  },

  /*
  ******************************************************************************
                            Helper Functions
  ******************************************************************************
  */
  /**
   * Retrieves all the purchases of a user and sends based on the userId
   */
  getPreviousPurchasesDB: async userId => {
    console.log("goes");
    const getPreviousPurchasesDB = "CALL get_previous_purchases(?)";
    const [queryError, queryResult] = await to(
      pool.promiseQuery(getPreviousPurchasesDB, [userId])
    );
    const [resultSet] = queryResult;
    //get any possible error
    if (queryError) {
      return queryError;
    } else {
      return resultSet;
    }
  },

  hashPassword: async password => {
    return (hashedPassword = await new Promise((resolve, reject) => {
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          resolve(undefined);
        } else {
          //call new function with hash
          resolve(hash);
        }
      });
    }));
  },
  /**
   * Checks if user is authorized to access data based on role.
   * One way is for the user requesting the action to be the user logged in.
   * Second way is for the person preforming the action to be an admin.
   */
  checkAuthorization: (userId, userIdJwt, userRole) => {
    if (userId == userIdJwt || userRole == role.ADMIN) {
      return true;
    } else {
      return false;
    }
  },

  //updates the details of a specific user
  updateDetails: async (userId, firstname, lastname, birthday) => {
    var updateUserDetails = "CALL update_user_details(?,?,?,?)";
    return await new Promise((res, rej) => {
      pool.query(
        updateUserDetails,
        [userId, firstname, lastname, birthday],
        (err, result) => {
          if (err) {
            console.log("ERROR");
            return rej();
          } else {
            return res();
          }
        }
      );
    });
  },

  // Checks if password provided by user is the same as in the database
  checkProvidedAndStoredPassword: async (
    passwordEncrypted,
    passwordProvided
  ) => {
    // Get the password from mysql object
    passwordEncrypted = passwordEncrypted[0][0].password;
    return (accepted = await new Promise((resolve, reject) => {
      bcrypt.compare(passwordProvided, passwordEncrypted, (err, result) => {
        if (err) {
          resolve(false);
        } else {
          resolve(result);
        }
      });
    }));
  },

  getVouchersFromUser: async userId => {
    var getUserVouchers = "CALL get_user_vouchers(?)";
    return await new Promise((res, rej) => {
      pool.query(getUserVouchers, [userId], (err, result) => {
        if (err) {
          return rej(err);
        } else {
          module.exports.filterUserVouchersBasedOnRedeemable(result[0]);

          return res(result[0]);
        }
      });
    });
  },
  //gets all the vouchers that a user has and removes all the ones that are not redeemable
  filterUserVouchersBasedOnRedeemable: vouchersArray => {
    for (voucher in vouchersArray) {
      //checks whether the voucher is unredeemable
      if (
        vouchersArray[voucher].is_redeem_allowed.includes(00) ||
        !module.exports.canBeUsedBasedOnNumberOfPeople(
          vouchersArray[voucher].number_of_usage,
          vouchersArray[voucher].max_number_allowed
        ) ||
        !module.exports.voucherDatesAreGood(
          vouchersArray[voucher].valid_from,
          vouchersArray[voucher].valid_until
        )
      ) {
        //saves the coupon id of the coupon that is about to be deleted
        var to_delete_coupon_id = vouchersArray[voucher].coupon_id;
        delete vouchersArray[voucher];
        vouchersArray[voucher] =
          "Coupon with id is not valid anymore : " + to_delete_coupon_id;
      }
    }
  },

  checkIfVoucherIsRedeemable: async voucherCode => {
    console.log(voucherCode);
    var getVoucherInformation =
      "CALL get_voucher_information_by_voucher_code(?)";

    const [queryError, queryResult] = await to(
      pool.promiseQuery(getVoucherInformation, [voucherCode])
    );

    //get any possible error
    if (queryError) {
      return queryError;
    }

    const [resultSet] = queryResult;
    console.log(queryResult);
    console.log(resultSet);
    //could not find the coupon being searched
    if (resultSet.length === 0) {
      return new Error("Does not exist");
    }

    //TODO might not have to do all the checks only the date and the redeemability
    //get the values needed to check for redeemability
    const [
      {
        is_redeem_allowed,
        max_number_allowed,
        valid_from,
        valid_until,
        number_of_usage
      }
    ] = resultSet;

    if (
      is_redeem_allowed.includes(00) ||
      !module.exports.canBeUsedBasedOnNumberOfPeople(
        number_of_usage,
        max_number_allowed
      ) ||
      !module.exports.voucherDatesAreGood(valid_from, valid_until)
    ) {
      return new Error("Is unredeemable");
    }

    return resultSet;

    // const [{ id }] = resultSet;
  },

  //Receives voucher starting, expiring date and checks whether the user can add it to the cart
  voucherDatesAreGood: (voucher_start_date, voucher_end_date) => {
    let current_date = moment(new Date()).format("YYYY/MM/DD");
    let voucher_start_date_final = moment(new Date(voucher_start_date)).format(
      "YYYY/MM/DD"
    );
    let voucher_end_date_final = moment(new Date(voucher_end_date)).format(
      "YYYY/MM/DD"
    );

    if (
      current_date >= voucher_end_date_final ||
      current_date < voucher_start_date_final
    ) {
      return false;
    } else {
      return true;
    }

    // console.log(mydate.toDateString());
  },

  canBeUsedBasedOnNumberOfPeople: (numberUsingVoucher, maxNumberAllowed) => {
    if (numberUsingVoucher >= maxNumberAllowed) {
      return false;
    }
    return true;
  },

  getUserDetailsFromDb: async userId => {
    var getUserDetails = "CALL get_customer_details_by_id(?)";
    return await new Promise((res, rej) => {
      pool.query(getUserDetails, [userId], (err, result) => {
        if (err) {
          return rej(err);
        } else {
          console.log(result[0]);
          return res(result[0][0]);
        }
      });
    });
  },

  checkIfVoucherCanBeUsedBasedOnNumberOfPeople: (
    numberUsingVoucher,
    maxNumberAllowed
  ) => {
    if (numberUsingVoucher >= maxNumberAllowed) {
      return false;
    }
    return true;
  }
};
