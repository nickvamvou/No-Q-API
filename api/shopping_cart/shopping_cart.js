/**
 * This class contains code describing the customer cart functionality.
 * @class Cart
 */

const pool = require("../../config/db_connection");
module.exports = {
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
   * `{url}/shopping_cart/userId/RFID/add`
   *
   * The particular method adds a particular product (based on RFID received) to the Cart of the user and if the user
   * does not have a Cart it creates a new one.
   *
   * @method addProductToCart
   * @param UserId
   * @param RFID
   * @param Barcode
   * @param Secured (boolean)
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
      //product id
      const productRFID = req.body.RFID;
      //check if product rfid exists and has not been bought
      var product = await module.exports
        .checkRFIDScanned(productRFID)
        .catch(err => {
          //the prduct with the specific RFID does not exist
          return res.status(404).json({
            message: "RFID not found"
          });
        });

      //get the user from the url
      const userId = req.params.userId;
      var customer_cart = await module.exports
        .getCartFromCustomer(userId)
        .catch(err => {
          console.log("LOL");
          return res.status(500).json({
            message: "Error with DB connection"
          });
        });
      //customer does not have any cart
      if (customer_cart.length === 0) {
        //create a cart for the user based on the customer id and the store id
        var cart_id = await module.exports
          .createCustomerCart(userId, product.store_id)
          .catch(err => {
            console.log(err);
            return res.status(500).json({
              message: "Could not create new cart for user"
            });
          });
        //update the customer cart id so the product can be added to the specific cart
        customer_cart.cart_id = cart_id;
      }
      //TODO ask developer whether I should check again if the product is in any other cart
      //add the product to customers cart
      else {
        await module.exports
          .addProductToUsersCart(product.product_id, customer_cart.cart_id)
          .catch(err => {
            res.status(404).json({
              message: "Customer already has the product in his/her cart"
            });
          });
        //item added to cart
        res.status(200).json({
          message: product,
          cart_id: customer_cart.cart_id
        });
      }
    }
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
        .catch(err => {
          return res.status(500).json({
            message: "Error with DB connection when getting users cart"
          });
        });
      //customer has no cart
      if (customer_cart.length === 0) {
        return res.status(404).json({
          message: "Cart not found"
        });
      } else {
        //delete product from cart
        var itemId = req.params.itemId;
        var result = await module.exports
          .deleteProductFromCart(itemId, customer_cart.cart_id)
          .catch(err => {
            return res.status(500).json({
              message: "Could not remove product from users cart"
            });
          });
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
            message: "Product not removed from cart because it was not found"
          });
        }
      }
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
  }
};
