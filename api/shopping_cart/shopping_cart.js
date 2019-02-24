/**
 * This class contains code describing the customer cart functionality.
 * @class Cart
 */

const pool = require("../../config/db_connection");
const to = require("await-to-js").default;

//error
const DB_ERROR = -1;
const DB_EMPTY_RESPONSE = -2;

module.exports = {
  DB_ERROR,

  getCompletedOrder: (req, res, next) => {
    var authorized = checkAuthorization(
      req.params.userId,
      req.userData.id,
      req.userData.role,
      req.params.orderId
    );
    if (authorized) {
      //extract product id
      const productId = req.params.orderId;
      res.status(200).json({
        message: "Retrieve information about order"
      });
    }
  },
  getUserCompletedOrders: (req, res, next) => {
    var authorized = checkAuthorization(
      req.params.userId,
      req.userData.id,
      req.userData.role
    );
    if (authorized) {
      //get all the orders of the user
    }
  },

  // /**
  //  * `{url}/shopping_cart/userId/RFID/create`
  //  *
  //  * The particular method creates a new Cart for the User and adds the specific item to the Cart. This endpoint
  //  * should be called when a customer does not have a cart
  //  * @method createCartAndAddProduct
  //  * @param  userId
  //  * @param RFID
  //  * @param Barcode
  //  * @param Secured (boolean)
  //  * @return Product Details (Product information associated with the RFID received)
  //  * @throws Error (404) when RFID is not found.
  //            Error (500) System Failure.
  //            Error (404) when User already has product in his/her Cart.
  //  */
  // createCartAndAddProduct: async (req, res, next) => {
  //   //check for role and matching user data in URL with matching data with the token
  //   //TODO uncomment section below
  //   // var authorized = checkAuthorizationRole(
  //   //   req.userData.id,
  //   //   req.params.userId,
  //   //   req.userData.role
  //   // );
  //
  //
  //
  // },

  /**
   * `{url}/shopping_cart/userId/itemId/add`
   *
   * The particular method adds a particular product (based on RFID received) to the Cart of the user and if the user
   * does not have a Cart it creates a new one.
   *
   * @method addProductToCart
   * @param RFID (int)
   * @param barcode (int)
   * @param secured (boolean)
   * @param cart_id
   * @param store_id
   * @return Product Details (Product information associated with the RFID received)
   * @throws Error (404) when RFID is not found.
             Error (500) System Failure.
             Error (404) when User already has product in his/her Cart.
   */

  addProductToCart: async (req, res, next) => {
    //check for role and matching user data in URL with matching data with the token
    //TODO uncomment section below
    // var authorized = checkAuthorizationRole(
    //   req.userData.id,
    //   req.params.userId,
    //   req.userData.role
    // );

    authorized = true;

    if (authorized) {
      //product has barcode and is not RFID enabled
      if (!req.body.secured) {
        //check if the cart is active

        console.log(req.body.cart_id);

        //holds the storeId of the active cart
        var storeIdOfActiveCart = await module.exports.cartIsActive(
          req.body.cart_id
        );

        if (storeIdOfActiveCart instanceof Error) {
          return res.status(500).json({
            message: storeIdOfActiveCart
          });
        }

        //that variable stores the cart that will receive the product
        var cart_id = req.body.cart_id;
        //takes cases where
        ////the user has an active cart but his cart belongs to a different shop
        //the user does not have an active cart
        if (
          storeIdOfActiveCart === DB_EMPTY_RESPONSE ||
          storeIdOfActiveCart !== req.body.store_id
        ) {
          //TODO THE PROBLEM IS HERE WITH RECEIVING THE STORE ID WHICH NEEDS CHANGING - storeIdOfActiveCart IS WRONG
          //the user has an active cart but his cart belongs to a different shop
          if (storeIdOfActiveCart !== req.body.store_id) {
            console.log("GOES HERE TO DELETE");

            console.log("STORE ID TO DELETE : " + req.body.store_id);
            console.log("USER ID TO DELETE : " + req.params.userId);

            //get the cart id delete cart id from the cart and the active cart table
            var cartDeletion = await module.exports.deleteCartFromCartAndFromActive(
              storeIdOfActiveCart,
              req.params.userId
            );

            //there was a problem deleting the cart
            if (cartDeletion instanceof Error) {
              return res.status(500).json({
                message: cartDeletion
              });
            }
          }

          //create new cart in the cart table and make it an active cart
          var cartIdCreated = await module.exports.createNewCartAndMakeItActive(
            req.params.userId,
            req.body.store_id
          );

          if (cartIdCreated instanceof Error) {
            return res.status(500).json({
              message: cartIdCreated
            });
          }

          //add product to the new cart and return cart
          cart_id = cartIdCreated;
          console.log("CREATED A CARD WITH ID : " + cart_id);
        }

        console.log("REACHED HERE");

        //the user has an active cart to the particular shop, add the product to the cart
        var cartItems = await module.exports.addProductToUsersCartBasedOnBarcode(
          req.body.barcode,
          cart_id
        );
        if (cartItems instanceof Error) {
          return res.status(500).json({
            message: cartItems
          });
        }
        return res.status(200).json({
          message: "Product added to cart"
        });
      }

      // RFID SOLUTION
      // const productRFID = req.body.RFID;
      // //check if product rfid exists and has not been bought
      // var product = await module.exports
      //   .checkRFIDScanned(productRFID)
      //   .then(async product => {
      //     //get the user from the url
      //     const userId = req.params.userId;
      //     var customer_cart = await module.exports
      //       .getCartFromCustomer(userId)
      //       .then(async customer_cart => {
      //         //customer does not have any cart
      //         if (customer_cart.length === 0) {
      //           try {
      //             //create a cart for the user based on the customer id and the store id
      //             var cart_id = await module.exports.createCustomerCart(
      //               userId,
      //               product.store_id
      //             );
      //             //update the customer cart id so the product can be added to the specific cart
      //             customer_cart.cart_id = cart_id;
      //           } catch (err) {
      //             return res.status(500).json({
      //               message: "Could not create new cart for user"
      //             });
      //           }
      //         }
      //         //TODO ask developer whether I should check again if the product is in any other cart
      //         //add the product to customers cart
      //         await module.exports
      //           .addProductToUsersCart(
      //             product.product_id,
      //             customer_cart.cart_id
      //           )
      //           .then(() => {
      //             //item added to cart
      //             res.status(200).json({
      //               message: product,
      //               cart_id: customer_cart.cart_id
      //             });
      //           })
      //           .catch(err => {
      //             console.log("ALWAYS IN");
      //             return res.status(404).json({
      //               message: "Customer already has the product in his/her cart"
      //             });
      //           });
      //       })
      //       .catch(err => {
      //         return res.status(500).json({
      //           message: "Error with DB connection"
      //         });
      //       });
      //   })
      //   .catch(err => {
      //     //the prduct with the specific RFID does not exist
      //     return res.status(404).json({
      //       message: "RFID not found"
      //     });
      //   });
    } else {
      return res.status(401).json({
        message: "Authentication Failed"
      });
    }
  },

  addProductToUsersCartBasedOnBarcode: async (barcode, cartId) => {
    const addProductToCartBasedOnBarcode =
      "CALL add_product_based_barcode_to_user_cart(?, ?)";

    const [queryError, queryResult] = await to(
      pool.promiseQuery(addProductToCartBasedOnBarcode, [barcode, cartId])
    );
    //get any possible error
    if (queryError) {
      console.log("GOES IN THE SECOND ERROR");
      return queryError;
    } else {
      return;
    }
  },

  /*
    Receives cart id and deletes it from the cart and the active cart table
  */
  deleteCartFromCartAndFromActive: async (shop_id, user_id) => {
    console.log("sp : " + shop_id);
    console.log("ui : " + user_id);
    const deleteActiveCart = "CALL delete_cart(?,?)";
    const [queryError, queryResult] = await to(
      pool.promiseQuery(deleteActiveCart, [shop_id, user_id])
    );
    //get any possible error
    if (queryError) {
      return queryError;
    } else {
      return;
    }
  },

  /*
    Receives a cart id and checks if its active. If active it returns the store id of the active cart
  */
  cartIsActive: async cartId => {
    const checkCartActive = "CALL cart_is_active(?)";
    const [queryError, queryResult] = await to(
      pool.promiseQuery(checkCartActive, [cartId])
    );

    //get any possible error
    if (queryError) {
      return queryError;
    }

    const [resultSet] = queryResult;

    if (!resultSet.length) {
      console.log("NO CART");
      return DB_EMPTY_RESPONSE;
    }

    const [{ store_id }] = resultSet;
    console.log("THERE IS A CART AND IT BELONGS TO THIS STORE : " + store_id);
    //contains the store id
    return store_id;
  },

  /*
    Receives the customer id who is going to be the owner of the cart and
    the store id which the cart will belong. Returns the id of the new cart.
  */
  createNewCartAndMakeItActive: async (customer_id, store_id) => {
    const createNewCart = "CALL create_new_active_cart(?,?)";
    const [queryError, queryResult] = await to(
      pool.promiseQuery(createNewCart, [customer_id, store_id])
    );

    //get any possible error
    if (queryError) {
      return queryError;
    }

    const [resultSet] = queryResult;

    if (!resultSet.length) {
      return DB_EMPTY_RESPONSE;
    }

    const [{ id }] = resultSet;
    //returns the id of the new cart
    return id;
  },

  /*
    receives ProductId and cartId and adds the product to the cart
    adds the specific product to the cart
  */

  addProductToUsersCart: async (productId, cartId) => {
    var addProductToCart = "CALL add_product_to_user_cart(?, ?)";
    return await new Promise((res, rej) => {
      pool.query(addProductToCart, [productId, cartId], (err, result) => {
        if (err) {
          return rej(err);
        } else {
          console.log("PRODUCT ADDED TO CART");
          return res();
        }
      });
    });
  },

  /**
   * `{url}/shopping_cart/userId/itemId/remove`
   *
   * The particular method removes a particular product (based on itemID received) from the Users cart.
   *
   *
   * @method removeProductFromCart
   * @param UserId
   * @param ItemId
   * @return Whether the deletion was successful or not and the new cart
   * @throws Error (500) System Failure.
             Error (404) item not found in Users Cart.
            Error (404) cart not found.
   */

  removeProductFromCart: async (req, res, next) => {
    // //check for role and matching user data in URL with matching data with the token
    // var authorized = checkAuthorizationRole(
    //   req.userData.id,
    //   req.params.userId,
    //   req.userData.role
    // );

    authorized = true;

    if (authorized) {
      //get the user from the url
      const userId = req.params.userId;
      //get cart id from user
      var customer_cart = await module.exports
        .getCartFromCustomer(userId)
        .then(async customer_cart => {
          //customer has no cart
          if (customer_cart.length === 0) {
            return res.status(404).json({
              message: "Cart not found"
            });
          } else {
            //delete product from cart
            var itemId = req.body.itemId;
            var result = await module.exports
              .deleteProductFromCart(itemId, customer_cart.cart_id)
              .then(async result => {
                //this means that the item was deleted, as the result is the number of affected rows in the db
                if (result !== 0) {
                  return res.status(200).json({
                    message: "Product successfuly removed from cart",
                    cart: customer_cart
                  });
                }
                //no item was deleted which means that the item was not found
                else {
                  return res.status(404).json({
                    message:
                      "Product not removed from cart because it was not found"
                  });
                }
              })
              .catch(err => {
                return res.status(500).json({
                  message: "Could not remove product from users cart"
                });
              });
          }
        })
        .catch(err => {
          return res.status(500).json({
            message: "Error with DB connection when getting users cart"
          });
        });
    }
  },

  //or by id
  addVoucherToCart: async (req, res, next) => {
    // //check for role and matching user data in URL with matching data with the token
    // var authorized = checkAuthorizationRole(
    //   req.userData.id,
    //   req.params.userId,
    //   req.userData.role
    // );

    authorized = true;
    if (authorized) {
      //check if the voucher is valid and redeemable, if it is return the voucher id
      await module.exports
        .checkIfVoucherIsRedeemable(req.body.voucherCode)
        .then(async voucher_id => {
          //get the customer cart_id from user
          var cart_id = await module.exports
            .getCartFromCustomer(req.params.userId)
            .then(async customer_cart => {
              await module.exports
                .addVoucherToCartDB(voucher_id, customer_cart.cart_id)
                .then(() => {
                  return res.status(200).json({
                    message: "Coupon added successfully to cart",
                    coupon_id: voucher_id
                  });
                })
                .catch(err => {
                  return res.status(404).json({
                    message: "Could not add Voucher to Cart"
                  });
                });
            })
            .catch(err => {
              return res.status(404).json({
                message: "Customer does not have a cart"
              });
            });
        })
        .catch(err => {
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
      //if redeemable and valid add it to users cart
    } else {
      return res.status(401).json({
        message: "Authentication Failed"
      });
    }
  },

  payForOrder: (req, res, next) => {
    //we need a product id in request body
    //get total amount of order which includes the particular rfid (based on store id, rfid)
    //charge user
    //add the order as a purchase
  },

  //HELPER FUNCTIONS, these functions do not query the database
  //checks if user id is the same as user ID found in JWT token.
  checkAuthorizationRole: (userId, userIdJwt, role) => {
    if (userId === userIdJwt || role === role.ADMIN) {
      return true;
    } else {
      return false;
    }
  },
  //returns true if specific retailer owns a specif store
  checkShopperOwnsProduct: (userId, storeId) => {
    return true;
  },
  //decides whether to authorize individual based on user id and order id
  //based on #1 the user id param in URL, #2 user id found in the JWT token, role of user found in JWT and store id found in URL
  checkAuthorization: (userId, userIdJwt, role, orderId) => {
    var argumentsLength = arguments.length;
    if (argumentsLength === 3) {
      if (
        role === role.ADMIN ||
        checkShopperOwnsProduct(arguments[0], arguments[2])
      ) {
        return true;
      } else {
        return false;
      }
    }
    if (argumentsLength === 4)
      if (
        checkAuthorizationRole(userId, userIdJwt, role) &&
        checkShopperOwnsProduct(userId, storeId)
      ) {
        return true;
      } else {
        return false;
      }
  },

  //check if an RFID code scanned exists in the product table
  /*
    receives RFID
    returns whether the RFID is located in the products table
  */
  checkRFIDScanned: async RFID => {
    var getProductBasedOnRFIDReceived = "CALL get_product_by_RFID(?)";
    return (product = await new Promise((res, rej) => {
      pool.query(getProductBasedOnRFIDReceived, [RFID], (err, result) => {
        if (err) {
          console.log("ERROR");
          return rej(err);
        } else {
          //the RFID does not exist in db
          if (result[0] === undefined || result[0] == 0) {
            rej("Product does not Exist");
          } else {
            //create a new array to hold all the options
            var final_product = {};
            var option_values = [];
            var option_group_names = [];

            //get all the option values
            for (i = 0; i < result[0].length; i++) {
              option_values.push(result[0][i].option_value);
              option_group_names.push(result[0][i].option_group_name);
            }
            //get all product details
            for (var property in result[0][0]) {
              if (
                property !== "option_value" &&
                property !== "option_group_name"
              ) {
                console.log(typeof property);
                final_product[property] = result[0][0][property];
              }
            }
            //add option properties to product details
            final_product["option_values"] = option_values;
            final_product["option_group_names"] = option_group_names;

            res(final_product);
          }
        }
      });
    }));
  },
  /*
     receives user id
     returns user cart
  */
  getCartFromCustomer: async userId => {
    console.log("CUSTOMER : " + userId);
    var getUsersCart = "CALL get_customer_cart(?)";
    return (product = await new Promise((res, rej) => {
      pool.query(getUsersCart, [userId], (err, result) => {
        if (err) {
          return rej(err);
        } else {
          //the RFID does not exist in db
          if (result[0] === undefined || result[0] == 0) {
            res([]);
          } else {
            console.log(result);
            res(result[0][0]);
          }
        }
      });
    }));
  },

  /*
    accepts userId, store of cart (based on scanned product), customerId
  */
  //create cart for user
  createCustomerCart: async (customerId, storeId) => {
    console.log("CUSTOMER ID : " + customerId);
    console.log("STORE ID : " + storeId);

    //userId
    var createCustomerCart = "CALL create_customer_cart(?,?)";
    return (cart_id = await new Promise((res, rej) => {
      pool.query(createCustomerCart, [customerId, storeId], (err, result) => {
        if (err) {
          return rej(err);
        } else {
          //return the cart id
          return res(result[0][0].id);
        }
      });
    }));
  },

  //returns if there is an effect on a deleted row or not (if a product was deleted fom the cart)
  deleteProductFromCart: async (productId, cartId) => {
    var removeProductFromCart = "CALL delete_product_from_user_cart(?, ?)";
    return (result = await new Promise((res, rej) => {
      pool.query(removeProductFromCart, [productId, cartId], (err, result) => {
        if (err) {
          return rej(err);
        } else {
          return res(result.affectedRows);
        }
      });
    }));
  },

  checkIfVoucherIsRedeemable: async voucherCode => {
    var getVoucherIdAndReedemable = "CALL get_voucher_reedemable_and_id(?)";
    return (cart_id = await new Promise((res, rej) => {
      pool.query(getVoucherIdAndReedemable, [voucherCode], (err, result) => {
        if (err) {
          return rej(err);
        } else {
          //wrong voucher code
          if (result[0].length === 0) {
            return rej(1);
          }
          //reedemable is null
          if (result[0][0].reedemable === null) {
            return rej(2);
          }
          //its is not redeemable
          if (result[0][0].reedemable.includes(00)) {
            return rej(3);
          }
          //its redeemable
          else {
            return res(result[0][0].coupon_id);
          }
          //return the cart id
        }
      });
    }));
  },

  addVoucherToCartDB: async (voucher_id, cartId) => {
    var addVoucherToUserCart = "CALL add_voucher_to_cart(?,?)";
    return await new Promise((res, rej) => {
      pool.query(addVoucherToUserCart, [voucher_id, cartId], (err, result) => {
        if (err) {
          return rej(err);
        } else {
          return res();
        }
      });
    });
  }
};
