var fs = require("fs");
const pool = require("../../config/db_connection");
const role = require("../user/user-role");
const jwt = require("jsonwebtoken");
const key = require("../../config/jwt_s_key");

module.exports = {
  /*
   *****************************************************************************
   *           Store Creation, Deletion and Modification
   *****************************************************************************
   */

  /**
   * Responsible for creating a new store.
   * The owner of the store is obtained from req under the user data.
   * @return On Success JSON returned as {"Store created", store_id}.
   */
  createNewStore: (req, res, next) => {
    //id of retailer to create new store
    const retailerId = req.userData.id;
    /*
    Checks if the requesting user is the same as the owner of the store
    to be created for or the requesting user is an admin.
     */
    var authorized = module.exports.checkAuthorizationRole(
      req.userData.id,
      req.params.userId,
      req.userData.role
    );

    if (authorized) {
      const storeInformation = {
        date_registered: new Date(),
        store_type: req.body.storeType,
        phone_number: req.body.phoneNumber,
        store_name: req.body.storeName
        // address: {
        //   street_name: req.body.address.streetName,
        //   flat_num: req.body.address.flatNum,
        //   house_num: req.body.address.houseNum,
        //   post_code: req.body.address.postCode,
        //   city: req.body.address.city,
        //   country: req.body.address.country
        // }
      };
      //add store to db
      console.log("STORE TYPE : " + storeInformation.store_type);
      var createStoreSQL = "CALL create_store(?,?,?,?)";
      var idas = 0;
      pool.query(
        createStoreSQL,
        [
          storeInformation.store_type,
          storeInformation.phone_number,
          storeInformation.store_name,
          req.params.userId
        ],
        (err, result) => {
          if (err) {
            return res.status(500).json({
              message: err
            });
          } else {
            return res.status(200).json({
              message: "Store created",
              storeId: result[0][0].sid
            });
          }
        }
      );
    } else {
      return res.status(401).json({
        message: "Authentication Failed"
      });
    }
  },

  /**
   * Remove store from a retailer given the id of the store.
   * Only administrators can remove stores.
   * @return On Success the function returns JSON {"Store deleted", store_id}
   */
  removeStore: (req, res, next) => {
    // Check if user is administrator
    var authorized = module.exports.checkAuthorizationRole(
      req.userData.id,
      req.params.userId,
      req.userData.role
    );
    //remove the store immediately as if reached this point the user is an admin
    var removeStore = "CALL delete_store_by_id(?)";
    //get the store id
    pool.query(removeStore, req.params.storeId, (err, result) => {
      if (err) {
        res.status(500).json({
          message: "Store cannot be deleted from db"
        });
      } else {
        res.status(200).json({
          message: "Store deleted",
          storeId: req.params.storeId
        });
      }
    });
  },

  //req.params.userId is the userId received from URL
  //req.userData.id is the user id added from check-auth in JWT token
  //req.userData.role is the user role added from check-auth in JWT token
  //req.params.storeId is the store id provided by the URL
  getAllStores: (req, res, next) => {
    //retrieve all stores with their information
    //NO NEED TO CHECK FOR ADMIN
    var allStores = "CALL all_stores(?)";
    pool.query(allStores, (err, result) => {
      if (err) {
        res.status(500).json({
          message: err
        });
      } else if (result[0].length == 0) {
        res.status(200).json({
          message: "There are no stores in database"
        });
      } else {
        res.status(200).json({
          storeIds: result[0][0].store_id
        });
      }
    });
  },

  //get all the stores managed by a single user
  getStoresOfUser: (req, res, next) => {
    //checks if user is authorized to access information about the store
    //authorization if store id is managed from user id
    var authorized = module.exports.checkAuthorizationRole(
      req.userData.id,
      req.params.userId,
      req.userData.role
    );

    if (authorized) {
      //get all orders from specific store where user managing the store is id, by passing the store id
      var storesOfUser = "CALL get_retailer_stores(?)";

      pool.query(storesOfUser, req.params.userId, (err, result) => {
        if (err) {
          res.status(500).json({
            message: err
          });
        }
        //empty response no customers found
        else if (result[0].length == 0) {
          res.status(200).json({
            message: "This user has no stores registered"
          });
        }
        //customers retrieved
        else {
          res.status(200).json({
            storeIds: result[0][0].store_id
          });
        }
      });
    } else {
      return res.status(401).json({
        message: "Authentication failed"
      });
    }
  },
  //get all orders from store
  getStoreOrders: (req, res, next) => {
    //authorization if store id is managed from user id
    var authorized = module.exports
      .checkAuthorization(
        req.userData.id,
        req.userData.role,
        req.params.storeId
      )
      .then(authorized => {
        if (authorized) {
          //get all customers from store based on their orders
          var ordersFromStore = "CALL get_store_purchases(?)";
          pool.query(ordersFromStore, req.params.storeId, (err, result) => {
            console.log(result);
            if (err) {
              res.status(500).json({
                message: err
              });
            }
            //empty response no customers found
            else if (result[0].length == 0) {
              res.status(200).json({
                message: "This store has no orders"
              });
            }
            //customers retrieved
            else {
              res.status(200).json({
                orderIds: result[0][0].customer_id
              });
            }
          });
        } else {
          return res.status(401).json({
            message: "Authentication failed, user has no access in this store"
          });
        }
      });
  },
  //get all customer details from specifc store
  getStoreCustomers: (req, res, next) => {
    //checks if user is authorized to access information about the store
    module.exports
      .checkAuthorization(
        req.userData.id,
        req.userData.role,
        req.params.storeId
      )
      .then(authorized => {
        if (authorized) {
          //get all customers from store based on their orders
          var customersFromStore = "CALL get_store_customers(?)";

          pool.query(customersFromStore, req.params.storeId, (err, result) => {
            if (err) {
              res.status(500).json({
                message: err
              });
            }
            //empty response no customers found
            else if (result[0].length == 0) {
              res.status(200).json({
                message: "This store has no customers"
              });
            }
            //customers retrieved
            else {
              res.status(200).json({
                customersIds: result[0][0].customer_id
              });
            }
          });
        } else {
          return res.status(401).json({
            message: "Authentication failed, user has no access in this store"
          });
        }
      });
  },
  getProductsFromStore: (req, res, next) => {
    //checks if user is authorized to access information about the store
    var authorized = checkAuthorization(
      req.userData.id,
      req.userData.role,
      req.params.storeId
    );
    if (authorized) {
    }
  },
  addNewProduct: (req, res, next) => {
    //checks if user is authorized to access information about the store
    var authorized = checkAuthorization(
      req.userData.id,
      req.userData.role,
      req.params.storeId
    );
    if (authorized) {
      //file path is file.path
      const product = {
        productRFID: req.body.rfid,
        productPrice: req.body.price,
        productType: req.body.type
      };
      res.status(200).json({
        message: "Order was created",
        product: product
      });
    }
  },

  //removes an item from the store
  removeItem: (req, res, next) => {
    //checks if user is authorized to access information about the store
    var authorized = checkAuthorization(
      req.userData.id,
      req.userData.role,
      req.params.storeId
    );
    if (authorized) {
      //get the parameter of the store
      const storeId = req.params.storeId;
      //get the parameter of the rfid item to remove
      const rfidItem = req.body.rfid;
      // const retailerEmail = req.userData.email;

      //check if user is authorized to delete the certain product
      //check if product eist in the storeID

      //delete the product from db

      //delete photo of product from server

      //Must account for format
      fs.unlink(
        "product_photos/stores/" + storeId + "/" + rfidItem + ".jpeg",
        error => {
          if (error) {
            throw error;
          }
          console.log("File Deleted From Server");
          res.status(200).json({
            message: "Photo delete from server"
          });
        }
      );
    }
  },
  updateProduct: (req, res, next) => {
    var authorized = checkAuthorization(
      req.userData.id,
      req.userData.role,
      req.params.storeId
    );
    if (authorized) {
      //edit product information
    }
  },
  /**
   * Creates a new product detail and returns the id of the created row.
   * @param req  Should include userData{id, role}, storeId as a parameter
   *             product details name, description and id in the request
   *             body.
   * @param {[type]}   res  If successful then a JSON with the created
   *                        product detail id. Otherwise the appropraite
   *                        error message.
   */
  addNewProductDetails: (req, res, next) => {
    var productDetails = {
      name: req.body.productName,
      product_description: req.body.productDescription,
      product_retailer_id: req.body.productRetailerId
    };

    //checks if user is authorized to access information about the store
    module.exports
      .checkAuthorization(
        req.userData.id,
        req.userData.role,
        req.params.storeId
      )
      .then(authorized => {
        if (authorized) {
          //create new product details entry
          var createProductDetailsEntry =
            "CALL create_product_details(?, ?, ?)";

          pool.query(
            createProductDetailsEntry,
            [
              productDetails.name,
              productDetails.product_description,
              productDetails.product_details_id
            ],
            (err, result) => {
              if (err) {
                res.status(500).json({
                  message: err
                });
              }
              //Id of the new product detail.
              else {
                res.status(200).json({
                  productDetailId: result[0][0].product_detail_id
                });
              }
            }
          );
        } else {
          return res.status(401).json({
            message: "Authentication failed, user has no access in this store"
          });
        }
      });
  },
  /**
   * Adds the products option groups and values given by the user.
   * @param {[type]}   req  [description]
   * @param {[type]}   res  [description]
   * @param {Function} next [description]
   */
  addProductOptions: (req, res, next) => {
    // Check if requesting user is the same as the logged in user.
    var authorized = module.exports
      .checkAuthorizationRole(
        req.userData.id,
        req.params.userId,
        req.userData.role
      )
      .then(authorized => {
        if (authorized) {
          var options;
          // {'options': "option_group":"name", "option_values": "value"}
        }
      });
    // .then(authorized => {
    // if (authorized) {
    // THINGS TO DO:
    // Before everything the option groups will be sent as a JSON array
    // of objects [{'Option Group':[values]}]
    //
    // As for how to store the values on the server side check this link:
    //  https://stackoverflow.com/questions/33381583/how-to-add-many-values-to-one-key-in-javascript-object
    //
    //
    // 1) Check if the option group already exists.
    //    a) if it does then get the id of it.
    //    b) if it doesn't then create a new option group and get its id.
    //
    // 2) Once all option groups are created, enter the values in the options table.
    //

    //     //checking if the product details to be associated with the particular product exist
    //     var productDetailsExist = module.exports
    //       .checkIfProductDetailsIdExists(req.params.productDetailsId)
    //       .then(detailsExist => {
    //         //the details that will be associated with the product entry to exist
    //         if (detailsExist) {
    //           //if the details do exist then create new product entry and associate product category and product id
    //           //get all customers from store based on their orders
    //           var productEntry = {
    //             product_details_id: req.params.productDetailsId,
    //             rfid: req.body.rfid
    //           };
    //           var createNewProductEntry = "CALL get_store_purchases(?)";
    //           pool.query(
    //             createNewProductEntry,
    //             req.params.storeId,
    //             (err, result) => {
    //               console.log(result);
    //               if (err) {
    //                 res.status(500).json({
    //                   message: err
    //                 });
    //               }
    //               // //empty response no customers found
    //               // else if (result[0].length == 0) {
    //               //   res.status(200).json({
    //               //     message: "This store has no orders"
    //               //   });
    //               // }
    //               //customers retrieved
    //               else {
    //                 //add options and rfid tags by getting the id of the product
    //                 //query
    //                 var rfidOptions = {
    //                   idProduct: result[0][0].product_id,
    //                   options: req.body.options
    //                 };
    //                 res.status(200).json({
    //                   orderIds: result[0][0].customer_id
    //                 });
    //               }
    //             }
    //           );
    //         } else {
    //           return res.status(404).json({
    //             message:
    //               "Product details id trying to associate with new product does not exist"
    //           });
    //         }
    //       });
    //   } else {
    //     return res.status(401).json({
    //       message: "Authentication failed, user has no access in this store"
    //     });
    //   }
    // });
  },
  //after creating a new product detail entry, the options and the product is created
  //productDetails id, rfid, photo, color, size etc are needed
  addNewProductEntry: (req, res, next) => {
    //authorization if store id is managed from user id
    var authorized = module.exports
      .checkAuthorization(
        req.userData.id,
        req.userData.role,
        req.params.storeId
      )
      .then(authorized => {
        if (authorized) {
          //checking if the product details to be associated with the particular product exist
          var productDetailsExist = module.exports
            .checkIfProductDetailsIdExists(req.params.productDetailsId)
            .then(detailsExist => {
              //the details that will be associated with the product entry to exist
              if (detailsExist) {
                //if the details do exist then create new product entry and associate product category and product id
                //get all customers from store based on their orders
                var productEntry = {
                  product_details_id: req.params.productDetailsId,
                  rfid: req.body.rfid
                };
                var createNewProductEntry = "CALL get_store_purchases(?)";
                pool.query(
                  createNewProductEntry,
                  req.params.storeId,
                  (err, result) => {
                    console.log(result);
                    if (err) {
                      res.status(500).json({
                        message: err
                      });
                    }
                    // //empty response no customers found
                    // else if (result[0].length == 0) {
                    //   res.status(200).json({
                    //     message: "This store has no orders"
                    //   });
                    // }
                    //customers retrieved
                    else {
                      //add options and rfid tags by getting the id of the product
                      //query
                      var rfidOptions = {
                        idProduct: result[0][0].product_id,
                        options: req.body.options
                      };
                      res.status(200).json({
                        orderIds: result[0][0].customer_id
                      });
                    }
                  }
                );
              } else {
                return res.status(404).json({
                  message:
                    "Product details id trying to associate with new product does not exist"
                });
              }
            });
        } else {
          return res.status(401).json({
            message: "Authentication failed, user has no access in this store"
          });
        }
      });
  },
  //this method adds a door to a shop
  addDoorToShop: (req, res, next) => {
    //check authorization if retailer can add door, if its his shop or ADMIN
    //if yes add door and
  },
  doorLogin: (req, res, next) => {},

  /*
   *****************************************************************************
   *                         Create, edit a product
   *****************************************************************************
   */

  /*
  ******************************************************************************
   Helper Functions help main functions with ownership and authorization mainly
  ******************************************************************************
  */
  //checks if there is id for specifc product detail
  checkIfProductDetailsIdExists: productDetailId => {
    //this function must be async
    return true;
  },

  //checks if user id is the same as user ID found in JWT token.
  checkAuthorizationRole: (userId, userIdJwt, role) => {
    if (userId == userIdJwt || role == role.ADMIN) {
      return true;
    } else {
      console.log("NOT PASSING");
      return false;
    }
  },
  //returns true if specific retailer owns a specific store
  checkRetailerOwnsStore: async (userId, storeId) => {
    var getStoreIdBasedOnUserId = "CALL get_store_by_uid(?,?)";
    return (authorized = await new Promise((resolve, reject) => {
      pool.query(getStoreIdBasedOnUserId, [userId, storeId], (err, result) => {
        if (err) {
          resolve(false);
        }
        //empty response
        else if (result[0].length == 0) {
          console.log("WENT HERE");
          resolve(false);
        }
        //store id retrieved if user is owner
        else {
          // console.log(result[0][0].store_id);
          resolve(true);
        }
      });
    }));
  },
  //decides whether to authorize individual based on an user id owning a shop
  //based on #1 the user id param in URL, #2 user id found in the JWT token, role of user found in JWT and store id found in URL
  checkAuthorization: async (...args) => {
    argumentsLength = args.length;
    if (argumentsLength === 3) {
      if (args[1] == role.ADMIN) {
        return true;
      }
      return (authenticationBasedOnStoreOwnership = await new Promise(
        (resolve, reject) => {
          module.exports
            //gets retailer and store id
            .checkRetailerOwnsStore(args[0], args[2])
            .then(authorizeBasedOnOwnership => {
              if (authorizeBasedOnOwnership) {
                resolve(true);
              } else {
                resolve(false);
              }
            });
        }
      ));
    }
    if (argumentsLength === 4) {
      if (module.exports.checkAuthorizationRole(args[0], args[1], args[2])) {
        return (authenticationBasedOnStoreOwnership = await new Promise(
          (resolve, reject) => {
            module.exports
              .checkRetailerOwnsStore(args[0], args[3])
              .then(authorizeBasedOnOwnership => {
                if (authorizeBasedOnOwnership) {
                  console.log("GOES");
                  resolve(true);
                } else {
                  console.log("GOES FALSE");
                  resolve(false);
                }
              });
          }
        ));
      }
    }
  }
};