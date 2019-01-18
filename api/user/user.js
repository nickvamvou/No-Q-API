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

  // Add a promo code to a Shopper.
  addPromoCode: (req, res, next) => {
    const userId = req.params.userId;
    const promoId = req.body.promoId;

    //check if promoId exists, if it has been used, if it has been expired etc
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
  }
};
