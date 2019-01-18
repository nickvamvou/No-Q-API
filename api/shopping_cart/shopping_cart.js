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

  /**
   *
   * Accepts (RFID product code).
   * Returns (Product information associated with the RFID)
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
          message: product
        });
      }
    }
  },
  removeProductFromOrder: (req, res, next) => {
    //check for role and matching user data in URL with matching data with the token
    var authorized = checkAuthorizationRole(
      req.userData.id,
      req.params.userId,
      req.userData.role
    );
    if (authorized) {
      //product id
      const productId = req.params.itemId;
      //user id
      const userId = req.userData.id;
      //check if user has the product to be removed
      //remove product Id from doors
      //remove product id and customer id from the joint table
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
            res(result[0][0]);
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
  }
};
