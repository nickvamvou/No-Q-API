/**
 * This class contains code describing the customer cart functionality.
 * @class Cart
 */

const pool = require("../../config/db_connection");
const to = require("await-to-js").default;
const moment = require("moment");
const createHttpError = require("http-errors");
//error
const DB_ERROR = -1;
const DB_EMPTY_RESPONSE = -2;

module.exports = {
  DB_ERROR,

  //accepts cart_id and card_id and creates a payment for
  payForCart: async ({ body: { cart_id, card_id } }, res, next) => {
    const { dbTransactionInstance } = res.locals;

    var cartDeletion = await module.exports.deleteActiveCart(
      cart_id,
      dbTransactionInstance
    );

    //there was a problem deleting the cart
    if (cartDeletion instanceof Error) {
      await dbTransactionInstance.rollbackAndReleaseConn();
      return next(createHttpError(500, "Error when deleting active cart"));
    }

    //cart is deleted
    //create payment and retrieve the payment id
    var payment_id = await module.exports.createPayment(
      card_id,
      cart_id,
      dbTransactionInstance
    );

    if (payment_id instanceof Error) {
      await dbTransactionInstance.rollbackAndReleaseConn();
      return next(createHttpError(500, payment_id));
    }

    //create a purchase based on the payment
    var purchase_id = await module.exports.createPurchase(
      payment_id,
      cart_id,
      dbTransactionInstance
    );

    if (purchase_id instanceof Error) {
      await dbTransactionInstance.rollbackAndReleaseConn();
      return next(createHttpError(500, purchase_id));
    }

    // Pass final response object to DB transaction middleware.
    res.locals.finalResponse = {
      message: "Purchase completed",
      data: {
        purchase_id: purchase_id
      }
    };

    next();
  },

  createPurchase: async (payment_id, cart_id, dbTransactionInstance) => {
    const createPurchaseProcedure = "CALL create_purchase(?,?,?)";
    var purchaseTime = moment(new Date())
      .format("YYYY/MM/DD hh:mm:ss")
      .toString();
    let [queryError, queryResult] = await to(
      dbTransactionInstance.query(createPurchaseProcedure, [
        purchaseTime,
        payment_id,
        cart_id
      ])
    );

    if (queryError) {
      return queryError;
    } else if (queryResult.length === 0) {
      return new Error();
    } else {
      const [resultSet] = queryResult;
      const [id] = resultSet;
      return id.id;
    }
  },

  createPayment: async (card_id, cart_id, dbTransactionInstance) => {
    const createPaymentProcedure = "CALL create_payment(?)";
    let [queryError, queryResult] = await to(
      dbTransactionInstance.query(createPaymentProcedure, [card_id, cart_id])
    );

    //get any possible error
    if (queryError) {
      return queryError;
    } else if (queryResult.length === 0) {
      return new Error();
    } else {
      const [resultSet] = queryResult;
      const [id] = resultSet;
      return id.id;
    }
  },

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

  //receives a products barcode and retrieves information based on the barcode
  //receives storeId and barcode
  getProductInformationBasedOnBarcode: async (req, res, next) => {
    //based on storeId and barcode retrieves the product information
    var product_information = await module.exports.getProductInformationBasedOnBarcodeDB(
      req.params.storeId,
      req.params.barcode
    );

    if (product_information instanceof Error) {
      return res.status(500).json({
        message: "Could not find product information in the store provided"
      });
    } else {
      return res.status(200).json({
        product_information: product_information
      });
    }
  },

  getProductInformationBasedOnBarcodeDB: async (storeId, barcode) => {
    const getProductInformationBasedOnBarcodeDBProcedure =
      "CALL get_product_infromation_from_barcode(?, ?)";

    const [queryError, queryResult] = await to(
      pool.promiseQuery(getProductInformationBasedOnBarcodeDBProcedure, [
        storeId,
        barcode
      ])
    );
    //get any possible error
    if (queryError) {
      return queryError;
    } else {
      const [resultSet] = queryResult;
      //could not found information about the particular product
      if (resultSet.length === 0) {
        return new Error(500);
      } else {
        return module.exports.filterCartProductsWithOptionsBeforeLogin(
          resultSet
        );
      }
    }
  },

  /**
   * `{url}/shopping_cart/userId/remove`
   *
   * The particular method adds a particular product (based on RFID received) to the Cart of the user and if the user
   * does not have a Cart it creates a new one.
   *
   * @method product_id
   * @param cart_id
   * @return Whether the product was deleted
   * @throws Error500
   */

  removeProductFromCartByBarcode: async (req, res, next) => {
    authorized = true;
    if (authorized) {
      var deleted = await module.exports.deleteProductFromCartDB(
        req.body.product_id,
        req.body.cart_id
      );
      if (deleted instanceof Error || deleted.affectedRows === 0) {
        return res.status(500).json({
          message:
            "Product not deleted because it could not be found or because of DB error"
        });
      }
      return res.status(200).json({
        message: "Product has been deleted from cart"
      });
    }
  },

  deleteProductFromCartDB: async (product_id, cart_id) => {
    const deleteProductFromUserCartDB =
      "CALL delete_product_from_user_cart(?, ?)";

    const [queryError, queryResult] = await to(
      pool.promiseQuery(deleteProductFromUserCartDB, [product_id, cart_id])
    );
    //get any possible error
    if (queryError) {
      return queryError;
    }
    return queryResult;
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
    const { dbTransactionInstance } = res.locals;
    console.log("reaches");

    //product has barcode and is not RFID enabled
    if (!req.body.secured) {
      //check if the cart is active

      //holds the storeId of the active cart
      var storeIdOfActiveCart = await module.exports.cartIsActive(
        req.body.cart_id,
        req.params.userId
      );

      if (storeIdOfActiveCart instanceof Error) {
        await dbTransactionInstance.rollbackAndReleaseConn();
        return next(createHttpError(500, storeIdOfActiveCart));
      }

      console.log("reaches 1");

      //that variable stores the cart that will receive the product
      var cart_id = req.body.cart_id;
      //takes cases where
      ////the user has an active cart but his cart belongs to a different shop
      //the user has active cart but the cart submitted is not the same as the active cart
      //the user does not have an active cart
      if (
        storeIdOfActiveCart === DB_EMPTY_RESPONSE ||
        storeIdOfActiveCart.store_id !== req.body.store_id ||
        storeIdOfActiveCart.cart_id !== req.body.cart_id
      ) {
        //TODO THE PROBLEM IS HERE WITH RECEIVING THE STORE ID WHICH NEEDS CHANGING - storeIdOfActiveCart IS WRONG
        //the user has an active cart but his cart belongs to a different shop
        if (
          storeIdOfActiveCart !== req.body.store_id ||
          storeIdOfActiveCart.cart_id !== req.body.cart_id
        ) {
          //Store id is correct
          var cartDeletion = await module.exports.deleteCartFromCartAndFromActive(
            storeIdOfActiveCart.store_id,
            req.params.userId,
            dbTransactionInstance
          );

          //there was a problem deleting the cart
          if (cartDeletion instanceof Error) {
            await dbTransactionInstance.rollbackAndReleaseConn();
            return next(createHttpError(500, cartDeletion));
          }
        }

        //create new cart in the cart table and make it an active cart
        var cartIdCreated = await module.exports.createNewCartAndMakeItActiveTransaction(
          req.params.userId,
          req.body.store_id,
          dbTransactionInstance
        );

        if (cartIdCreated instanceof Error) {
          await dbTransactionInstance.rollbackAndReleaseConn();
          return next(createHttpError(500, cartIdCreated));
        }

        cart_id = cartIdCreated;
      }

      //if more than 1 product needs to be added to the cart
      if (req.body.barcode.length > 1) {
        //the user has an active cart to the particular shop (or one is created), add the product to the cart
        var cartItems = await module.exports.addProductsToUsersCartBasedOnBarcode(
          req.body.barcode,
          cart_id,
          req.body.store_id,
          dbTransactionInstance
        );
      } else {
        //the user has an active cart to the particular shop (or one is created), add the product to the cart
        var cartItems = await module.exports.addProductToUsersCartBasedOnBarcode(
          req.body.barcode[0],
          cart_id,
          req.body.store_id,
          dbTransactionInstance
        );
      }

      if (cartItems instanceof Error) {
        await dbTransactionInstance.rollbackAndReleaseConn();
        return next(createHttpError(500, cartItems));
      }

      const cart_products = module.exports.filterCartProductsWithOptions(
        cartItems
      );

      res.locals.finalResponse = {
        message: "Product added to cart",
        cart_products: cart_products
      };

      next();
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
  },

  /**
   * `{url}/shopping_cart/userId/itemId/add`
   *
   * The particular method searches for an active cart that belongs to the user,
   together with the products of the cart, if user does not have active cart
   with the particular store it deletes previous carts creates a new one and sends
   back the new cart id
   *
   * @method getCartInformation
   * @param store_id (the store that the user is in)
   * @return Cart id + products in cart if user has an active cart with the particular shop
              or cart id if a new cart is created because user does not have active cart
             with the shop or has an active cart with another shop
   * @throws
   */
  getCartIDWithCartProductInformation: async (req, res, next) => {
    //TODO check for authorization
    console.log("GOES");
    const { dbTransactionInstance } = res.locals;
    //check if user has active cart with the particular shop (stores the cart id)
    var cartIdAndProducts = await module.exports.getActiveCartIdAndProductInformation(
      req.params.userId,
      req.body.store_id,
      dbTransactionInstance
    );

    if (cartIdAndProducts instanceof Error) {
      await dbTransactionInstance.rollbackAndReleaseConn();

      return next(createHttpError(500, cartIdAndProducts));
    }

    //if the result has more than two fields then the user has active cart in shop
    //and the cartIdAndProducts contains cart id and products of the active cart
    if (cartIdAndProducts[0].hasOwnProperty("product_id")) {
      //TODO pass the information to a filter function.

      const [{ cart_id }] = cartIdAndProducts;
      const [{ product_id }] = cartIdAndProducts;

      //user has a cart but its empty
      if (!product_id) {
        res.locals.finalResponse = {
          message: "Your existing cart has been retrieved",
          data: {
            cart_id: cart_id
          }
        };
        return next();
      }

      var cart_products = module.exports.filterCartProductsWithOptions(
        cartIdAndProducts
      );

      // Pass final response object to DB transaction middleware.
      res.locals.finalResponse = {
        message: "Your existing cart has been retrieved",
        data: {
          cart: cart_id,
          cart: cart_products
        }
      };
      return next();
    }
    //the user does not have an active cart with the shop
    else {
      //get how many active carts the user has (irrelevant from the store)
      const [{ number_active_carts }] = cartIdAndProducts;

      //if the user has 1 or more active carts with different shops delete the carts
      if (number_active_carts > 0) {
        const [{ cart_id }] = cartIdAndProducts;

        //get the store id that the user has an active cart in order to delete it
        const [{ store_id }] = cartIdAndProducts;
        var deleted = await module.exports.deleteActivecarts(
          cart_id,
          dbTransactionInstance
        );

        if (deleted instanceof Error) {
          await dbTransactionInstance.rollbackAndReleaseConn();
          return next(createHttpError(500, deleted));
        }
      }
      //create a new cart and return it to the user
      var cartId = await module.exports.createNewCartAndMakeItActiveTransaction(
        req.params.userId,
        req.body.store_id,
        dbTransactionInstance
      );

      if (cartId instanceof Error) {
        await dbTransactionInstance.rollbackAndReleaseConn();
        return next(createHttpError(500, cartId));
      }

      // Pass final response object to DB transaction middleware.
      res.locals.finalResponse = {
        message: "New cart created",
        data: {
          cart: cartId
        }
      };
      return next();
    }
    //if yes return all the items of the particular cart
    //if not delete all the active carts of the particualr SHOPPER
  },

  //TODO MAKE IT MORE OPTIMIZED - EFFICENT WITH THE QUERY - works in a hacky way
  /*
    Filter cart with product options. Gets a cart with product and filters it based on the options. Only returns one product
  */
  filterCartProductsWithOptionsBeforeLogin: cart_with_products => {
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

    // filtered_cart.push(current_product);
    //
    // filtered_cart = filtered_cart.slice(1);

    return current_product;
  },

  //TODO MAKE IT MORE OPTIMIZED - EFFICENT WITH THE QUERY - works in a hacky way
  /*
    Filter cart with product options. Gets a cart with product and filters it based on the options
  */
  filterCartProductsWithOptions: cart_with_products => {
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
  },

  /*
    Deletes all the active carts belonging to the user but not
    have the same shop as the user.
  */
  deleteActivecarts: async (cart_id, dbTransactionInstance) => {
    console.log("THATS THE ID PASSED TO DELETE THE CART : " + cart_id);
    //delete active cart from the user
    const deleteActiveCarts = "CALL delete_cart_by_id(?)";

    const [queryError, queryResult] = await to(
      dbTransactionInstance.query(deleteActiveCarts, [cart_id])
    );
    //get any possible error
    if (queryError) {
      return queryError;
    }

    //this means that the user has an active cart that belongs to the shop and the
    // result set holds the products of the cart with the cart id
    return queryResult;
  },

  /*
    Gets the active cart id together with the products of the cart (based on shop)
    if customer has cart with the shop. Gets number of active carts,
    if customer does not have active cart in the shop.
  */
  getActiveCartIdAndProductInformation: async (
    userId,
    storeId,
    dbTransactionInstance
  ) => {
    const getCartIdAndProducts = "CALL get_customer_active_cart_products(?,?)";

    console.log("User id passing in : " + userId);
    console.log("Store id passing in : " + storeId);

    const [queryError, queryResult] = await to(
      dbTransactionInstance.query(getCartIdAndProducts, [userId, storeId])
    );
    //get any possible error
    if (queryError) {
      return queryError;
    }
    const [resultSet] = queryResult;
    //this means that the user has an active cart that belongs to the shop and the
    // result set holds the products of the cart with the cart id
    return resultSet;
  },

  //adds a product to a users cart
  addProductToUsersCartBasedOnBarcode: async (
    barcode,
    cartId,
    storeId,
    dbTransactionInstance
  ) => {
    const addProductToCartBasedOnBarcode =
      "CALL add_product_based_barcode_to_user_cart(?, ?, ?, ?)";

    //TODO if user is not logged in then all the scans will have the same timing
    var timeItemIsScanned = moment(new Date())
      .format("YYYY/MM/DD hh:mm:ss")
      .toString();

    const [queryError, queryResult] = await to(
      dbTransactionInstance.query(addProductToCartBasedOnBarcode, [
        barcode,
        cartId,
        storeId,
        timeItemIsScanned
      ])
    );

    //get any possible error
    if (queryError) {
      return queryError;
    } else {
      const [resultSet] = queryResult;
      if (resultSet.length === 0) {
        console.log(resultSet);
        return new Error("No products found to add to the cart");
      } else {
        return resultSet;
      }
    }
  },

  addProductsToUsersCartBasedOnBarcode: async (
    barcodesArray,
    cartId,
    storeId,
    dbTransactionInstance
  ) => {
    if (barcodesArray.length === 0) {
      return new Error(500);
    }
    var failed = false;
    var products_added;
    for (barcode in barcodesArray) {
      var added = await module.exports.addProductToUsersCartBasedOnBarcode(
        barcodesArray[barcode],
        cartId,
        storeId,
        dbTransactionInstance
      );
      if (added instanceof Error) {
        failed = true;
        break;
      } else {
        products_added = added;
      }
    }
    if (failed) {
      return new Error(500);
    } else {
      return products_added;
    }
  },

  /*
    Receives cart id and deletes it from the cart and the active cart table
  */
  deleteCartFromCartAndFromActive: async (
    shop_id,
    user_id,
    dbTransactionInstance
  ) => {
    console.log("sp : " + shop_id);
    console.log("ui : " + user_id);
    console.log("here");
    const deleteActiveCart = "CALL delete_cart(?,?)";

    let [queryError, queryResult] = await to(
      dbTransactionInstance.query(deleteActiveCart, [shop_id, user_id])
    );

    console.log("goes down");
    //get any possible error
    if (queryError) {
      console.log("got an error");
      console.log(queryError);
      return queryError;
    } else {
      console.log(queryResult);
      return;
    }
  },

  /*
    Receives a cart id and checks if its active. If active it returns the store id of the active cart
  */
  cartIsActive: async (cartId, userId) => {
    const checkCartActive = "CALL cart_is_active(?,?)";
    const [queryError, queryResult] = await to(
      pool.promiseQuery(checkCartActive, [cartId, userId])
    );

    //get any possible error
    if (queryError) {
      return queryError;
    }

    const [resultSet] = queryResult;

    //USER DOES NOT HAVE ACTIVE CART TO ANY STORE
    if (resultSet.length === 0) {
      return DB_EMPTY_RESPONSE;
    }

    return resultSet[0];
  },

  /*
    Receives the customer id who is going to be the owner of the cart and
    the store id which the cart will belong. Returns the id of the new cart.
  */
  createNewCartAndMakeItActiveTransaction: async (
    customer_id,
    store_id,
    dbTransactionInstance
  ) => {
    const createNewCart = "CALL create_new_active_cart(?,?)";
    const [queryError, queryResult] = await to(
      dbTransactionInstance.query(createNewCart, [customer_id, store_id])
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
   * The particular method removes a particular product (based on productId received) from the Users cart.
   *
   *
   * @method removeProductFromCart
   * @param cart_id
   * @param product_id
   * @return Whether the deletion was successful or not and the new cart
   * @throws Error (500) System Failure.
             Error (404) item not found in Users Cart.
            Error (404) cart not found.
   */
  removeProductFromCartUpdated: async (req, res, next) => {
    //TODO check for authentication
    //if authorized
    var deleted = await module.exports.deleteProductFromCart(
      req.body.cart_id,
      req.body.product_id
    );
    if (deleted instanceof Error) {
      return res.status(500).json({
        message: deleted
      });
    }
    return res.status(200).json({
      message: "Product deleted successfully"
    });
  },

  deleteProductFromCart: async (cart_id, product_id) => {
    const deleteProductFromCartDB = "CALL delete_product_from_user_cart(?,?)";
    const [queryError, queryResult] = await to(
      pool.promiseQuery(deleteProductFromCartDB, [cart_id, product_id])
    );
    //get any possible error
    if (queryError) {
      return queryError;
    } else {
      return;
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
  deleteActiveCart: async (cart_id, dbTransactionInstance) => {
    const deleteActiveCartDB = "CALL delete_active_cart(?)";

    let [queryError, queryResult] = await to(
      dbTransactionInstance.query(deleteActiveCartDB, [cart_id])
    );

    //get any possible error
    if (queryError) {
      return queryError;
    } else {
      if (queryResult.affectedRows === 0) {
        return new Error("Cart not found");
      }
      console.log();
      return;
    }
  },
  //gets a cart (cart_id) and removes the voucher in this cart
  deleteVoucherFromCart: async (req, res, next) => {
    var deleted = await module.exports.removeVoucherFromCart(req.body.cart_id);
    if (deleted instanceof Error) {
      return res.status(500).json({
        message: "Voucher could not be deleted"
      });
    }
    return res.status(200).json({
      message: "Voucher successfuly removed from cart"
    });
  },

  removeVoucherFromCart: async cart_id => {
    var deleteVoucherFromActiveCart = "CALL delete_voucher_from_cart(?)";

    const [queryError, queryResult] = await to(
      pool.promiseQuery(deleteVoucherFromActiveCart, [cart_id])
    );

    //get any possible error
    if (queryError) {
      return queryError;
    }

    return queryResult;
  },

  //by code
  //get the customers cart id (if its not active do not add it)
  addVoucherToCart: async (req, res, next) => {
    //get the information of the voucher by the voucher code
    var voucher = await module.exports.checkIfVoucherIsRedeemable(
      req.body.coupon_code
    );
    //check if its redeemable
    if (voucher instanceof Error) {
      if (voucher.message === "Does not exist") {
        return res.status(500).json({
          message:
            "Could not add the voucher to the cart, because it does not exist or due to DB error"
        });
      } else if (voucher.message === "Is unredeemable") {
        return res.status(500).json({
          message:
            "Could not add the voucher to the cart, because it is not redeemable"
        });
      }
    }

    //add it to the cart which is passed, if the cart is not in an active state return error
    var added = await module.exports.addVoucherToCartDB(
      voucher[0].coupon_id,
      voucher[0].store_id,
      req.body.cart_id,
      req.userData.id
    );

    if (added instanceof Error) {
      console.log(added);
      return res.status(500).json({
        message:
          "Could not add the voucher to the cart, probably because cart is not active"
      });
    }

    console.log(voucher.coupon_id);
    res.status(200).json({
      message: "Voucher added",
      voucherId: voucher[0].coupon_id
    });
  },

  addVoucherToCartDB: async (coupon_id, store_id, cart_id, user_id) => {
    var addVoucherToActiveCart = "CALL add_voucher_to_active_cart(?, ?, ?, ?)";

    const [queryError, queryResult] = await to(
      pool.promiseQuery(addVoucherToActiveCart, [
        coupon_id,
        store_id,
        cart_id,
        user_id
      ])
    );

    //get any possible error
    if (queryError) {
      return queryError;
    }

    const [resultSet] = queryResult;

    console.log(resultSet);

    if (!resultSet[0].active_cart_variable) {
      console.log("HAHAHA");
      return new Error("Cart is not active");
    }

    return resultSet;
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
      {
        is_redeem_allowed,
        max_number_allowed,
        valid_from,
        valid_until,
        number_of_usage
      }
    ] = resultSet;

    console.log(valid_from);
    console.log(valid_until);

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

    console.log(current_date);
    console.log(voucher_start_date_final);

    if (
      current_date >= voucher_end_date_final ||
      current_date < voucher_start_date_final
    ) {
      return false;
    } else {
      console.log("true");
      return true;
    }

    // console.log(mydate.toDateString());
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

  canBeUsedBasedOnNumberOfPeople: (numberUsingVoucher, maxNumberAllowed) => {
    if (numberUsingVoucher >= maxNumberAllowed) {
      return false;
    }
    return true;
  }
};
