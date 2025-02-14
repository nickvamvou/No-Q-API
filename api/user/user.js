//This defines the user controller
const bcrypt = require("bcrypt");
const pool = require("../../config/db_connection");
const role = require("./user-role");
const jwt = require("jsonwebtoken");
const key = require("../../config/jwt_s_key");

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
    //delete the particular user from db
    // var authorized = module.exports.checkAuthorization(
    //   req.params.userId,
    //   req.userData.id,
    //   req.userData.role
    // );

    authorized = true;

    if (authorized) {
      //check if the voucher is valid and redeemable, if it is return the voucher id
      var voucher_id = await module.exports
        .checkIfVoucherIsRedeemable(req.body.voucherCode)
        //voucher details includes id of voucher max number allowed to use, how many have used it
        .then(async voucher_details => {
          //check if less that the required people have used it
          var checkBasedOnPeople = module.exports.checkIfVoucherCanBeUsedBasedOnNumberOfPeople(
            voucher_details.number_of_usage,
            voucher_details.max_number_allowed
          );

          if (checkBasedOnPeople) {
            //add it to the specific user
            await module.exports
              .addVoucherToUser(req.params.userId, voucher_details.coupon_id)
              .then(() => {
                //remove the number of people using the voucher + the max number of people that can use it and if its redeemable
                delete voucher_details.number_of_usage;
                delete voucher_details.max_number_allowed;
                delete voucher_details.reedemable;

                return res.status(200).json({
                  message: "Voucher was added to user",
                  voucher: voucher_details
                });
              })
              .catch(err => {
                if (err === 0) {
                  return res.status(404).json({
                    message: "User already has the particular voucher"
                  });
                }
                return res.status(500).json({
                  message:
                    "Voucher cannot be added to user see below for error message",
                  error: err
                });
              });
          }
          //cannot use the coupon because has reached maximum people to use
          //TODO make it unredeemable
          else {
            return res.status(404).json({
              message:
                "Voucher cannot be added, as it has been used from too many users"
            });
          }
        })
        .catch(err => {
          console.log(err);
          if (err === 1) {
            return res.status(404).json({
              message: "Wrong voucher code"
            });
          } else if (err === 2) {
            return res.status(404).json({
              message: "Redeemable of voucher is set to null"
            });
          } else {
            return res.status(404).json({
              message: "Voucher is currently not redeemable"
            });
          }
        });
    } else {
      return res.status(401).json({
        message: "Authentication Failed"
      });
    }

    //check if the voucher is valid and redeemable, if it is return the voucher id

    //TODO dont duplicate this method its supposed to be in shopping carts

    //add it to the voucher_user
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
          return res(result[0]);
        }
      });
    });
  },

  addVoucherToUser: async (userId, voucherId) => {
    var addVoucherToUserProcedure = "CALL add_voucher_to_user(?, ?)";
    return await new Promise((res, rej) => {
      pool.query(
        addVoucherToUserProcedure,
        [userId, voucherId],
        (err, result) => {
          if (err) {
            if (err.errno == 1062) {
              return rej(0);
            }
            return rej(err);
          } else {
            return res();
          }
        }
      );
    });
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
