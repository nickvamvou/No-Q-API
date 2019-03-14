//This defines the user controller
const createHttpError = require("http-errors");
const path = require("path");
const bcrypt = require("bcrypt");
const to = require("await-to-js").default;
const util = require("util");
const pool = require("../../config/db_connection");
// const cacheRegister = require('../../config/cache_register');
const mailer = require("../../config/mailer");
const role = require("./user-role");
const jwt = require("jsonwebtoken");
const key = require("../../config/jwt_s_key");
const utils = require("../utils");
const { initiateResetPassword } = require("./helpers");
var moment = require("moment");
const { SqlError } = utils;

module.exports = {
  /*
  ******************************************************************************
                            Signup Functions
  ******************************************************************************
  */

  // Sign up a shopper
  signupShopper: (req, res, next) => {
    /**
     * Check if email exists by getting the customer id by email.
     * If zero results returned then the email is available for registration.
     */
    var emailCheckSql = "CALL get_user_id_by_email(?)";
    pool.query(emailCheckSql, req.body.email, (err, result) => {
      if (err) {
        res.status(500).json({
          message: "Account cannot be created due to database"
        });
      }

      if (result[0].length === 0) {
        module.exports.hashPassword(req.body.password).then(hashedPassword => {
          var sql = "CALL create_customer(?,?)";
          pool.query(sql, [req.body.email, hashedPassword], (err, result) => {
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
  },

  /**
   * Sign-up a Retailer with a hashed password.
   * Accepts (email, password, companyName, brandName).
   */
  signupRetailer: (req, res, next) => {
    var emailCheckSql = "CALL get_user_id_by_email(?)";
    pool.query(emailCheckSql, [req.body.email], (err, result) => {
      if (err) {
        res.status(500).json({
          message: "Account cannot be created due to database"
        });
      } else if (result[0].length === 0) {
        module.exports.hashPassword(req.body.password).then(hashedPassword => {
          var sql = "CALL create_retailer(?,?,?,?)";
          pool.query(
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
  },

  /*
  ******************************************************************************
                            Login Functions
  ******************************************************************************
  */

  // Log-in a Shopper
  loginShopper: (req, res, next) => {
    // Check if there is a user with these credential based on email
    var emailCheckSql = "CALL get_customer_password_by_email(?)";
    pool.query(emailCheckSql, [req.body.email], (err, passwordAndId) => {
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
                role.SHOPPER
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
  },

  // Log-in a Retailer
  loginRetailer: (req, res, next) => {
    //check if there is a user with these credential based on email
    var emailCheckSql = "CALL get_retailer_password_by_email(?)";
    pool.query(emailCheckSql, [req.body.email], (err, passwordAndId) => {
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
                role.RETAILER
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
  },

  // Log-in an Admin
  loginAdmin: (req, res, next) => {
    //check if there is a user with these credential based on email
    var emailCheckSql = "CALL get_admin_password_by_email(?)";
    pool.query(emailCheckSql, [req.body.email], (err, passwordAndId) => {
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
                role.ADMIN
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

  /*
  ******************************************************************************
                            Helper Functions
  ******************************************************************************
  */
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

  // Creates a JWT in order to be attached to login response
  createJwtToken: (id, role) => {
    return (token = jwt.sign(
      {
        //the userId retrieved from the database
        id: id,
        role: role
      },
      key.jwt_key,
      {
        expiresIn: "1h"
      }
    ));
  },
  checkIfVoucherIsRedeemable: async voucherCode => {
    var getVoucherIdAndReedemable =
      "CALL get_voucher_reedemable_and_id_and_people_using(?)";
    return (cart_id = await new Promise((res, rej) => {
      pool.query(getVoucherIdAndReedemable, [voucherCode], (err, result) => {
        if (err) {
          return rej(err);
        } else {
          console.log(result[0]);
          //wrong voucher code
          if (result[0].length === 0) {
            return rej(1);
          }
          //reedemable is null
          if (result[0][0].reedemable === null) {
            return rej(2);
          } //its is not redeemable
          if (result[0][0].reedemable.includes(00)) {
            return rej(3);
          }
          //its redeemable
          else {
            return res(result[0][0]);
          }
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
          console.log();
          return res(result[0]);
        }
      });
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

  checkIfVoucherIsRedeemable: async voucherCode => {
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

    console.log(resultSet);
    //could not find the coupon being searched
    if (resultSet.length === 0) {
      return new Error("Does not exist");
    }

    //TODO might not have to do all the checks only the date and the redeemability
    //get the values needed to check for redeemability
    const [
      { is_redeem_allowed, max_number_allowed, valid_until, number_of_usage }
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
      current_date >= voucher_end_date_final &&
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
