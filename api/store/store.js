const to = require("await-to-js").default;
const createHttpError = require("http-errors");
const fs = require("fs");
const util = require("util");
const pool = require("../../config/db_connection");
const role = require("../user/user-role");
const utils = require("../utils");
const moment = require("moment");
const { SqlError, databaseUtil } = require("../utils");

/**
 * This class contains code describing the shop functionality.
 * @class Store
 */

module.exports = {
  /*
   *****************************************************************************
   *           Store Creation, Deletion and Modification
   *****************************************************************************
   */

  //gets all stores registered in the system
  getStores: async (req, res, next) => {
    var getStoresFromDB = "CALL get_all_stores()";
    const [queryError, queryResult] = await to(
      pool.promiseQuery(getStoresFromDB)
    );

    //get any possible error
    if (queryError) {
      return queryError;
    }
    return res.status(200).json({
      stores: queryResult
    });
  },

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

  /**
   * Endpoint: `GET store/:storeId/orders`
   * Primary actors: [ Retailer ]
   * Secondary actors: None
   *
   * This endpoint handler retrieves all orders
   * for a particular store.
   *
   * Alternative flows:
   *
   * - If error occurs while getting store orders from the database,
   *   halt process and forward database error to central error handler.
   *
   * @param `storeId` [Number] - `id` of the store to get resource from. Also used for authorization at the DB level.
   * @param `userId` [Number] - `id` of the requester. Strictly used for authorization at the DB level.
   *
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   */
  getStoreOrders: async (
    { params: { storeId }, userData: { id: userId } },
    res,
    next
  ) => {
    // Issue query to get all orders in a store.
    let [queryError, queryResult] = await to(
      pool.promiseQuery("call get_all_purchases_in_store(?, ?)", [
        storeId,
        userId
      ])
    );

    // Forward query error to central error handler.
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    // Get items groups from query result.
    const [orders] = queryResult;

    // Respond with list of all item groups.
    res.json({
      data: orders
    });
  },

  /**
   * Endpoint: `GET store/:storeId/orders/:orderId`
   * Primary actors: [ Retailer ]
   * Secondary actors: None
   *
   * This endpoint handler retrieves details
   * of an order.
   *
   * Alternative flows:
   *
   * - If error occurs while getting store orders from the database,
   *   halt process and forward database error to central error handler.
   *
   * @param `storeId` [Number] - `id` of the store to get resource from. Also used for authorization at the DB level.
   * @param `orderId` [Number] - `id` of the order.
   * @param `userId` [Number] - `id` of the requester. Strictly used for authorization at the DB level.
   *
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   */
  getStoreOrder: async (
    { params: { storeId, orderId }, userData: { id: userId } },
    res,
    next
  ) => {
    // Issue query to get details of an order.
    let [queryError, queryResult] = await to(
      pool.promiseQuery("call get_details_of_previous_purchase(?, ?, ?)", [
        storeId,
        orderId,
        userId
      ])
    );

    // Forward query error to central error handler.
    if (queryError) {
      console.log(queryError);
      return next(createHttpError(new SqlError(queryError)));
    }

    var filteredOrder = module.exports.filterCartProductsWithOptions(
      queryResult[0]
    );

    // Order not found? Send down a 404 error.
    if (!filteredOrder) {
      return next(createHttpError(404, "Order not found"));
    }

    // Return order
    res.json({
      data: filteredOrder
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
   * Endpoint: `POST /:storeId/itemGroups/:itemGroupId/productDetails`
   * Primary actors: [ Retailer ]
   * Secondary actors: None
   *
   *
   * This endpoint handler creates new details for a product
   * and returns the id of the newly added record when successful.
   *
   * Alternative flows;
   *
   * - If error occurs while executing query within the context of the DB transaction,
   *   rollback DB surface changes made so far, release connection, and forward error to central error handler.
   *
   *
   * @param `name` [String] - Name of the product.
   * @param `barcode` [String] - String containing characters that represent a barcode.
   * @param `SKU` [String] - Store Keeping Unit code.
   * @param `quantity` [Number] - No of item of this product..
   * @param `price` [Decimal] - Price of the product.
   * @param `itemGroupId` [Number] - ID of the item group that the specific product belongs to.
   * @param `storeId` [Number] - ID of the store that product should to be created in.
   * @param `userId` [Number] - Id of retailer performing action.
   *
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   */
  createProductDetails: async (
    {
      body: { name, barcode, SKU, quantity, price },
      params: { itemGroupId, storeId },
      userData: { id: userId }
    },
    res,
    next
  ) => {
    const { dbTransactionInstance, optionIds } = res.locals;

    // Issue query to DB to create new details of a product along with the item group it belongs to.
    let [queryError, queryResult] = await to(
      dbTransactionInstance.query(
        "call create_product_details(?, ?, ?, ?, ?, ?, ?, ?)",
        [name, barcode, SKU, quantity, price, itemGroupId, storeId, userId]
      )
    );

    // Forward fatal error to global error handler
    if (queryError) {
      await dbTransactionInstance.rollbackAndReleaseConn();

      return next(createHttpError(new SqlError(queryError)));
    }

    // Retrieve actual result set from query result
    const [[{ product_details_id: productDetailsId }]] = queryResult;

    // Issue query to DB to bulk insert option value references.
    [queryError] = await to(
      dbTransactionInstance.query("call add_or_change_product_options(?, ?)", [
        productDetailsId,
        JSON.stringify(optionIds)
      ])
    );

    // Forward fatal error to global error handler
    if (queryError) {
      await dbTransactionInstance.rollbackAndReleaseConn();

      return next(createHttpError(new SqlError(queryError)));
    }

    // Pass final response object to DB transaction middleware.
    res.locals.finalResponse = {
      message: "Product details was created",
      data: {
        id: productDetailsId
      }
    };

    next();
  },

  /**
   *
   * Endpoint: `DELETE store/:storeId/productDetails/:productDetailsId`
   * Primary actors: [ Retailer ]
   * Secondary actors: None
   *
   * This endpoint handler flags details of a product as deleted
   * within a store.
   *
   * Alternative flows:
   *
   * - If database error occurs,
   *   halt process and forward database error to central error handler.
   *
   * @param `productDetailsId` [Number] - `id` of product details record.
   * @param `storeId` [Number] - `id` of the store to delete resource from. Also used for authorization at the DB level.
   * @param `userId` [Number] - `id` of the requester. Strictly used for authorization at the DB level.
   *
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   */
  softDelProductDetails: async (
    { params: { productDetailsId, storeId }, userData: { id: userId } },
    res,
    next
  ) => {
    // Issue query flag product details as deleted.
    let [queryError] = await to(
      pool.promiseQuery("call update_product_details_as_deleted(?, ?, ?)", [
        productDetailsId,
        storeId,
        userId
      ])
    );

    // Forward query error to central error handler.
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    // Respond with a 204 - NO CONTENT
    res.status(204).send();
  },

  /**
   * Retrieves all product details in a particular store.
   *
   * @param req - express request object containing information about the request -- request payload, route params, etc
   * @param res - express response object
   * @param next - function that forwards processes to the next express handler or middleware
   */
  getAllProductDetails: async (req, res, next) => {
    // Issue query to get all product details in a store/shop
    const [queryError, queryResult] = await to(
      pool.promiseQuery("CALL get_all_product_details_by_store_id(?)", [
        req.params.storeId
      ])
    );

    // Forward fatal error to global error handler
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    // Retrieve actual result set from query result
    const [resultSet] = queryResult;

    // Dish out final result :)
    res.status(200).json(resultSet);
  },

  /**
   * Retrieves details of a specific product in a store
   *
   * @param req - express request object containing information about the request -- request payload, route params, etc
   * @param res - express response object
   * @param next - function that forwards processes to the next express handler or middleware
   */
  getProductDetails: async (
    { params: { productDetailsId, storeId }, userData },
    res,
    next
  ) => {
    // Issue query to get details of a product in a store
    const [queryError, queryResult] = await to(
      pool.promiseQuery("CALL get_product_details_by_id(?, ?, ?)", [
        productDetailsId,
        storeId,
        userData.id
      ])
    );

    // Forward fatal error to global error handler
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    // Retrieve actual result set from query result
    const [resultSet] = queryResult;

    // Return 404 if the requested product details was not found
    if (!resultSet.length) {
      return next(createHttpError(404, "Product details was not found"));
    }

    // Dish out final result :)
    res.status(200).json(resultSet[0]);
  },

  /**
   * Endpoint: `GET store/:storeId/itemGroups/:itemGroupId/products`
   * Primary actors: [ Retailer ]
   * Secondary actors: None
   *
   * This endpoint handler retrieves all specific details of a product
   * for a particular item group.
   *
   * Alternative flows:
   *
   * - If error occurs while getting product details from the database,
   *   halt process and forward database error to central error handler.
   *
   * @param `itemGroupId` [Number] - `id` of the item group
   *
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   */
  getProductDetailsByItemGroup: async (
    { params: { itemGroupId } },
    res,
    next
  ) => {
    // Issue query to get details of a product in a store
    const [queryError, queryResult] = await to(
      pool.promiseQuery("CALL get_product_details_by_item_group_id(?)", [
        itemGroupId
      ])
    );

    // Forward fatal error to global error handler
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    // Retrieve actual result set from query result
    const [productDetails] = queryResult;

    // Dish out final result :)
    res.json({
      data: productDetails
    });
  },

  /**
   *
   * Endpoints: [`POST store/:storeId/itemGroups`, `PATCH store/:storeId/itemGroups/:itemGroupId`]
   * Primary actors: [ Retailer ]
   * Secondary actors: None
   *
   *
   * This endpoint handler creates or updates an item group -- e.g a for a shirt that comes in different colors and
   * sizes, then adds item group to a category if a `categoryId` is provided, creates option groups and corresponding
   * values, and finally adds each created option value to the item group. This sequence of operations is enveloped in
   * a database transaction for better management :)
   *
   * If all goes well, Retailer gets id of newly created item group to be used for further actions.
   *
   * Alternative flows:
   *
   * - If error occurs while getting a connection from the pool, forward error to central error handler.
   *
   * - If error occurs while starting a transaction, forward error to central error handler.
   *
   * - If error occurs while executing any of the queries within the context of the DB transaction,
   *   rollback DB surface changes made so far, release connection, and forward error to central error handler.
   *
   * - If error occurs while committing changes so far to database, rollback all the surface changes.
   *
   *
   * @param `name` [String] - Name of the item group.
   * @param `description` [String] = Description of the item group, providing more context.
   * @param `code` [String] - Unique code assigned to item group.
   * @param `categoryId` [Number] - `id` of the category the item group should belong to -- e.g Electronics.
   * @param `optionGroups` [Array] - A list of grouped option values by name.
   * @param `storeId` [Number] - `id` of the store where item group will be created.
   * @param `itemGroupId` [Number] - Only required for updating an item group.
   *
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   *
   * TODO: Abstract database transaction code into a DatabaseTransaction class that can be reused.
   *
   * TODO: --- Find a good alternative to nested for loops for creating option groups and associated values. ---
   * TODO: --- Potential mild performance bottleneck here. ---
   *
   * TODO: DRY up the block of code handling database query errors! Code becomes bloated when using DB transactions.
   *
   * TODO: --- Consider splitting up this endpoint handler into maybe 2 handlers that can be used on the same route;
   *   ---
   * TODO: --- controller/handler chaining. Express makes this seamless and clean! It might be cleaner ---
   * TODO: --- to have a dedicated endpoint for adding option groups and values to an item group. Something like
   * TODO: --- `/store/:storeId/itemGroups/:itemGroupId/options` -- GET and POST. It'll be easier to auto test!
   *
   * TODO: Is there a better data structure to represent option groups and corresponding values?
   *
   */
  createOrUpdateItemGroup: async (
    {
      body: { name, description, code, categoryId, optionGroups },
      params: { storeId, itemGroupId: existingItemGroupId }
    },
    res,
    next
  ) => {
    // Transactions need to maintain changes made across sequence of actions -- the state of every query.
    // Thus, the need for a single connection instance.
    // Grab a free connection instance for the connection pool.
    const [connErr, conn] = await to(pool.getConnection());

    // Forward `connErr` to central error handler
    if (connErr) {
      return next(createHttpError(connErr));
    }

    // Create promise-based transaction functions.
    const beginTransaction = util.promisify(conn.beginTransaction).bind(conn);
    const query = util.promisify(conn.query).bind(conn);
    const rollback = util.promisify(conn.rollback).bind(conn);
    const commit = util.promisify(conn.commit).bind(conn);

    // Begin new database transaction.
    const [beginTransErr] = await to(beginTransaction());

    // Error starting database transaction. Forward error!
    if (beginTransErr) {
      return next(createHttpError(beginTransErr));
    }

    /* Every query from here on is executed within the database transaction. */

    // Issue query to create new item group.
    let [queryError, queryResult] = await to(
      query("call create_or_update_item_group(?, ?, ?, ?)", [
        existingItemGroupId,
        name,
        description,
        code
      ])
    );

    // Rollback DB ops(queries) so far, put connection back in pool -- release it!, and forward query error to central
    // error handler.
    if (queryError) {
      await rollback();
      conn.release();

      return next(createHttpError(new SqlError(queryError)));
    }

    // Get `itemGroupId` from query result.
    const [[{ item_group_id: itemGroupId }]] = queryResult;

    // Only add new item group to store.
    if (!existingItemGroupId) {
      // Issue query to add item group to store.
      [queryError] = await to(
        query("call add_store_item_group(?, ?)", [itemGroupId, storeId])
      );

      // Rollback DB ops(queries) so far, put connection back in pool -- release it!, and forward query error to central
      // error handler.
      if (queryError) {
        await rollback();
        conn.release();

        return next(createHttpError(new SqlError(queryError)));
      }
    }

    // Add item group to a category if needed -- `categoryId` is provided.
    if (categoryId) {
      [queryError] = await to(
        query("call add_or_change_item_group_category(?, ?)", [
          itemGroupId,
          categoryId
        ])
      );

      // Rollback DB ops(queries) so far, put connection back in pool -- release it!, and forward query error to
      // central error handler.
      if (queryError) {
        await rollback();
        conn.release();

        return next(createHttpError(new SqlError(queryError)));
      }
    }

    // Create option groups and values for created item group. Starts by going over `optionGroups` list/array
    // containing mapped option values to group names.
    for (const {
      id: existingOptionGroupId,
      name: optionGroupName,
      options
    } of optionGroups) {
      // Issue query to create new option group.
      [queryError, queryResult] = await to(
        query("call create_or_update_option_group(?, ?)", [
          existingOptionGroupId,
          optionGroupName
        ])
      );

      // Rollback DB ops(queries) so far, put connection back in pool -- release it!, and forward query error to
      // central error handler.
      if (queryError) {
        await rollback();
        conn.release();

        return next(createHttpError(new SqlError(queryError)));
      }

      // Get `optionGroupId` from query result for next query.
      const [[{ option_group_id: optionGroupId }]] = queryResult;

      // Slap on values to the newly created option group.
      for (const { id: existingOptionId, name: optionName } of options) {
        // Issue query to create option values for newly created option group.
        let [queryError, queryResult] = await to(
          query("call create_or_update_option(?, ?, ?)", [
            existingOptionId,
            optionGroupId,
            optionName
          ])
        );

        // Rollback DB ops(queries) so far, put connection back in pool -- release it!, and forward query error to
        // central error handler.
        if (queryError) {
          console.log(queryError);
          await rollback();
          conn.release();

          return next(createHttpError(new SqlError(queryError)));
        }

        // Get `optionId` from query result for next query.
        const [[{ option_id: optionId }]] = queryResult;

        // Add newly created option value to an item group.
        [queryError] = await to(
          query("call add_or_change_item_group_option(?, ?)", [
            itemGroupId,
            optionId
          ])
        );

        // Rollback DB ops(queries) so far, put connection back in pool -- release it!, and forward query error to
        // central error handler.
        if (queryError) {
          await rollback();
          conn.release();

          return next(createHttpError(new SqlError(queryError)));
        }
      }
    }

    // Make database changes so far persistent. Commit it!
    const [commitErr] = await to(commit());

    // If error occurs while persisting changes, rollback!
    if (commitErr) {
      await rollback();
    }

    // Finally, DB connection has served its purpose. Release it back into the pool.
    conn.release();

    // Respond with newly created `itemGroupId` and some message.
    res.json({
      message: `Item group was successfully ${
        !existingItemGroupId ? "created" : "updated"
      }`,
      data: {
        id: itemGroupId
      }
    });
  },

  /**
   * Endpoint: `GET store/:storeId/itemGroups`
   * Primary actors: [ Retailer ]
   * Secondary actors: None
   *
   *
   * This endpoint handler gets all item groups for a particular store along with the number of
   * associated `product details` for each item group.
   *
   * If all goes well, Retailer gets a list/array of all item groups with each item containing the;
   * group `name`, `item_code`, and `product_details_count`.
   *
   * Alternative flows:
   *
   * - If error occurs while getting item groups from DB, forward error to central error handler.
   *
   *
   * @param `req` [Object] - Express's HTTP request object.
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   */
  getAllItemGroups: async (req, res, next) => {
    // Issue query to get all item groups.
    let [queryError, queryResult] = await to(
      pool.promiseQuery("call get_all_item_groups")
    );

    // Forward query error to central error handler.
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    // Get items groups from query result.
    const [itemGroups] = queryResult;

    // Respond with list of all item groups.
    res.json({
      data: itemGroups
    });
  },

  /**
   *
   * Endpoint: `GET store/:storeId/scannedUnpaidProducts`
   * Primary actors: [ Retailer ]
   * Secondary actors: None
   *
   *
   * This endpoint handler gets all scanned products that hasn't been paid for
   * in a store, along with user info, item group info and other related info.
   *
   * Alternative flows:
   *
   * - If error occurs while getting scanned unpaid item from DB,
   *   halt process and forward error to central error handler.
   *
   *
   * @param `storeId` [Object] - Resource identity number of the store to get scanned unpaid items from.
   *
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   */
  getScannedUnpaidProducts: async ({ params: { storeId } }, res, next) => {
    // Issue query to get all scanned unpaid products.
    let [queryError, queryResult] = await to(
      pool.promiseQuery("call get_current_scanned_items(?)", [storeId])
    );

    // Forward query error to central error handler.
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    // Get returned products from query result.
    const [data] = queryResult;

    // Respond with list of all item groups.
    res.json({ data });
  },

  /**
   * Endpoint: `GET store/:storeId/itemGroups/:itemGroupId/products`
   * Primary actors: [ Retailer ]
   * Secondary actors: None
   *
   * This endpoint handler retrieves all specific details of a product
   * for a particular item group.
   *
   * Alternative flows:
   *
   * - If error occurs while getting product details from the database,
   *   halt process and forward database error to central error handler.
   *
   * @param `itemGroupId` [Number] - `id` of the item group
   * @param `storeId` [Number] - `id` of the store to get resource from. Also used for authorization at the DB level.
   * @param `userId` [Number] - `id` of the requester. Strictly used for authorization at the DB level.
   *
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   */
  getProductDetailsByItemGroup: async (
    { params: { itemGroupId, storeId }, userData: { id: userId } },
    res,
    next
  ) => {
    // Issue query to get details of a product in a store
    const [queryError, queryResult] = await to(
      pool.promiseQuery("CALL get_product_details_by_item_group_id(?, ?, ?)", [
        storeId,
        userId,
        itemGroupId
      ])
    );

    // Forward fatal error to global error handler
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    // Retrieve actual result set from query result
    const [productDetails] = queryResult;

    // Dish out final result :)
    res.json({
      data: productDetails
    });
  },

  /**
   *
   * Endpoints: [`POST store/:storeId/itemGroups`, `PATCH store/:storeId/itemGroups/:itemGroupId`]
   * Primary actors: [ Retailer ]
   * Secondary actors: None
   *
   *
   * This endpoint handler creates or updates an item group -- e.g a for a shirt that comes in different colors and
   * sizes, then adds item group to a category if a `categoryId` is provided, creates option groups and corresponding
   * values, and finally adds each created option value to the item group. This sequence of operations is enveloped in
   * a database transaction for better management :)
   *
   * If all goes well, Retailer gets id of newly created item group to be used for further actions.
   *
   * Alternative flows:
   *
   * - If error occurs while getting a connection from the pool, forward error to central error handler.
   *
   * - If error occurs while starting a transaction, forward error to central error handler.
   *
   * - If error occurs while executing any of the queries within the context of the DB transaction,
   *   rollback DB surface changes made so far, release connection, and forward error to central error handler.
   *
   * - If error occurs while committing changes so far to database, rollback all the surface changes.
   *
   *
   * @param `name` [String] - Name of the item group.
   * @param `description` [String] = Description of the item group, providing more context.
   * @param `code` [String] - Unique code assigned to item group.
   * @param `categoryId` [Number] - `id` of the category the item group should belong to -- e.g Electronics.
   * @param `optionGroups` [Array] - A list of grouped option values by name.
   * @param `storeId` [Number] - `id` of the store where item group will be created.
   * @param `itemGroupId` [Number] - Only required for updating an item group.
   *
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   *
   * TODO: Abstract database transaction code into a DatabaseTransaction class that can be reused.
   *
   * TODO: --- Find a good alternative to nested for loops for creating option groups and associated values. ---
   * TODO: --- Potential mild performance bottleneck here. ---
   *
   * TODO: DRY up the block of code handling database query errors! Code becomes bloated when using DB transactions.
   *
   * TODO: --- Consider splitting up this endpoint handler into maybe 2 handlers that can be used on the same route;
   *   ---
   * TODO: --- controller/handler chaining. Express makes this seamless and clean! It might be cleaner ---
   * TODO: --- to have a dedicated endpoint for adding option groups and values to an item group. Something like
   * TODO: --- `/store/:storeId/itemGroups/:itemGroupId/options` -- GET and POST. It'll be easier to auto test!
   *
   * TODO: Is there a better data structure to represent option groups and corresponding values?
   *
   */
  createOrUpdateItemGroup: async (
    {
      body: { name, description, code, categoryId },
      params: { storeId, itemGroupId: existingItemGroupId },
      userData: { id: userId }
    },
    res,
    next
  ) => {
    console.log(userId);
    /* Every query from here on is executed within the database transaction. */

    const { dbTransactionInstance, optionIds } = res.locals;

    let [queryError, queryResult] = await to(
      dbTransactionInstance.query(
        "call create_or_update_item_group(?, ?, ?, ?, ?, ?)",
        [existingItemGroupId, name, description, code, storeId, userId]
      )
    );

    // Rollback DB ops(queries) so far, put connection back in pool -- release it!, and forward query error to central
    // error handler.
    if (queryError) {
      await dbTransactionInstance.rollbackAndReleaseConn();

      return next(createHttpError(new SqlError(queryError)));
    }

    // Get `itemGroupId` from query result.
    const [[{ item_group_id: itemGroupId }]] = queryResult;

    // Only add new item group to store.
    if (!existingItemGroupId) {
      // Issue query to add item group to store.

      [queryError] = await to(
        dbTransactionInstance.query("call add_store_item_group(?, ?)", [
          itemGroupId,
          storeId
        ])
      );

      // Rollback DB ops(queries) so far, put connection back in pool -- release it!, and forward query error to central
      // error handler.
      if (queryError) {
        await dbTransactionInstance.rollbackAndReleaseConn();

        return next(createHttpError(new SqlError(queryError)));
      }
    }

    // Add item group to a category if needed -- `categoryId` is provided.
    if (categoryId) {
      [queryError] = await to(
        dbTransactionInstance.query(
          "call add_or_change_item_group_category(?, ?)",
          [itemGroupId, categoryId]
        )
      );

      // Rollback DB ops(queries) so far, put connection back in pool -- release it!, and forward query error to
      // central error handler.
      if (queryError) {
        await dbTransactionInstance.rollbackAndReleaseConn();

        return next(createHttpError(new SqlError(queryError)));
      }
    }

    // Add newly created option value to an item group.
    [queryError] = await to(
      dbTransactionInstance.query(
        "call add_or_change_item_group_options(?, ?)",
        [itemGroupId, JSON.stringify(optionIds)]
      )
    );

    // Rollback DB ops(queries) so far, put connection back in pool -- release it!, and forward query error to
    // central error handler.
    if (queryError) {
      await dbTransactionInstance.rollbackAndReleaseConn();

      return next(createHttpError(new SqlError(queryError)));
    }

    // Respond with newly created `itemGroupId` and some message.
    res.locals.finalResponse = {
      message: `Item group was successfully ${
        !existingItemGroupId ? "created" : "updated"
      }`,
      data: {
        id: itemGroupId
      }
    };

    next();
  },

  createOrUpdateGroupedOptions: async ({ body: { options } }, res, next) => {
    const { dbTransactionInstance } = res.locals;
    let optionIds = [];

    // Create option groups and values for created item group. Starts by going over `optionGroups` list/array
    // containing mapped option values to group names.
    for (const { group, values } of options) {
      // Issue query to create new option group.
      let [queryError, queryResult] = await to(
        dbTransactionInstance.query("call create_or_update_option_group(?)", [
          group
        ])
      );

      // Rollback DB ops(queries) so far, put connection back in pool -- release it!, and forward query error to
      // central error handler.
      if (queryError) {
        await dbTransactionInstance.rollbackAndReleaseConn();
        return next(createHttpError(new SqlError(queryError)));
      }

      // Get `optionGroupId` from query result for next query.
      const [[{ option_group_id: optionGroupId }]] = queryResult;

      // Issue query to create option values for newly created option group.

      [queryError, queryResult] = await to(
        dbTransactionInstance.query("call create_or_update_options(?, ?)", [
          optionGroupId,
          JSON.stringify(values)
        ])
      );

      // Rollback DB ops(queries) so far, put connection back in pool -- release it!, and forward query error to
      // central error handler.
      if (queryError) {
        await dbTransactionInstance.rollbackAndReleaseConn();

        return next(createHttpError(new SqlError(queryError)));
      }

      const [[{ option_ids }]] = queryResult;

      optionIds = optionIds.concat(JSON.parse(option_ids));
    }

    res.locals.optionIds = optionIds;
    next();
  },

  /**
   *
   * Endpoint: `DELETE store/:storeId/itemGroups/:itemGroupId`
   * Primary actors: [ Retailer ]
   * Secondary actors: None
   *
   * This endpoint handler flags an item group as deleted
   * within a store.
   *
   * Alternative flows:
   *
   * - If database error occurs,
   *   halt process and forward database error to central error handler.
   *
   * @param `itemGroupId` [Number] - `id` of the item group
   * @param `storeId` [Number] - `id` of the store to delete resource from. Also used for authorization at the DB level.
   * @param `userId` [Number] - `id` of the requester. Strictly used for authorization at the DB level.
   *
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   */
  softDeleteItemGroup: async (
    { params: { itemGroupId, storeId }, userData: { id: userId } },
    res,
    next
  ) => {
    // Issue query flag item group as deleted.
    let [queryError] = await to(
      pool.promiseQuery("call update_item_group_as_deleted(?, ?, ?)", [
        itemGroupId,
        storeId,
        userId
      ])
    );

    // Forward query error to central error handler.
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    // Respond with a 204 - NO CONTENT
    res.status(204).send();
  },

  /**
   * Endpoint: `GET store/:storeId/itemGroups`
   * Primary actors: [ Retailer ]
   * Secondary actors: None
   *
   *
   * This endpoint handler gets all item groups for a particular store along with the number of
   * associated `product details` for each item group.
   *
   * If all goes well, Retailer gets a list/array of all item groups with each item containing the;
   * group `name`, `item_code`, and `product_details_count`.
   *
   * Alternative flows:
   *
   * - If error occurs while getting item groups from DB, forward error to central error handler.
   *
   *
   * @param `req` [Object] - Express's HTTP request object.
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   */
  getItemGroups: async (
    { params: { storeId }, userData: { id: userId } },
    res,
    next
  ) => {
    // Issue query to get all item groups.
    let [queryError, queryResult] = await to(
      pool.promiseQuery("call get_item_groups_by_store_id(?, ?)", [
        storeId,
        userId
      ])
    );

    // Forward query error to central error handler.
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    // Get items groups from query result.
    const [itemGroups] = queryResult;

    // Respond with list of all item groups.
    res.json({
      data: itemGroups
    });
  },

  /**
   *
   * Endpoint: `GET store/:storeId/scannedUnpaidProducts`
   * Primary actors: [ Retailer ]
   * Secondary actors: None
   *
   *
   * This endpoint handler gets all scanned products that hasn't been paid for
   * in a store, along with user info, item group info and other related info.
   *
   * Alternative flows:
   *
   * - If error occurs while getting scanned unpaid item from DB,
   *   halt process and forward error to central error handler.
   *
   *
   * @param `storeId` [Object] - Resource identity number of the store to get scanned unpaid items from.
   *
   * @param `res` [Object] - Express's HTTP response object.
   * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
   *
   */
  getScannedUnpaidProducts: async (
    { params: { storeId }, userData: { id: userId } },
    res,
    next
  ) => {
    console.log("hello");
    // Issue query to get all scanned unpaid products.
    let [queryError, queryResult] = await to(
      pool.promiseQuery("call get_current_scanned_items(?, ?)", [
        storeId,
        userId
      ])
    );

    // Forward query error to central error handler.
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    // Get returned products from query result.
    const [data] = queryResult;

    // Respond with list of all item groups.
    res.json({ data });
  },

  /**
   * Adds the products option groups and values given by the user.
   *
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

  /**
   * `{url}/:storeId/addVoucher`
   *
   * The particular method receives voucher details and adds it to the shop
   *
   *
   * @method addVoucherToShop
   * @param isPercentage (boolean to indicate if the voucher is a fixed price or percentage)
   * @param value (percentage of discount)
   * @param creation_date (date the coupon starts)
   * @param end_date (date the coupon expires)
   * @param voucher_code (code provided by the retailer)
   * @return Whether the voucher was added to DB and the details of the voucher
   * @throws Error (500) System Failure.
             Error (500) Voucher could not be added.
             Error (401) Authentication failed

   */
  addVoucherToShop: async (req, res, next) => {
    //TODO uncomment authorization
    // //authorization if store id is managed from user id
    // var authorized = module.exports
    //   .checkAuthorization(
    //     req.userData.id,
    //     req.userData.role,
    //     req.params.storeId
    //   )

    var authorized = true;
    const { dbTransactionInstance } = res.locals;
    console.log(req.params.storeId);
    if (authorized) {
      let voucherCode;

      let percentage;

      if (req.body.isPercentage) {
        percentage = 1;
      } else {
        percentage = 0;
      }

      var result = await module.exports
        .addVoucherToShopDB(
          req.body.value,
          percentage,
          req.body.start_date,
          req.body.end_date,
          req.body.voucher_code,
          req.body.max_number_allowed,
          req.params.storeId,
          req.userData.id,
          dbTransactionInstance
        )
        .then(voucher_details => {
          if (voucher_details instanceof Error) {
            return res.status(500).json({
              message: "Error with DB connection when trying to add voucher"
            });
          } else {
            res.locals.finalResponse = {
              message: "Voucher Added",
              voucher: voucher_details
            };
            next();
          }
        });
    } else {
      return res.status(401).json({
        message: "Authentication failed, user has no access in this store"
      });
    }
  },

  //gets the vouchers of a particular shop based on the shop id
  getVouchersFromShop: async (req, res, next) => {
    var vouchers = await module.exports.getVouchersFromShopDB(
      req.params.storeId,
      req.userData.id
    );
    if (vouchers instanceof Error) {
      return res.status(500).json({
        message: "Vouchers could not be retrieved for the particular shop"
      });
    }

    return res.status(200).json({
      message: "Vouchers retrieved",
      vouchers: vouchers
    });
  },

  //based on store id, the particular function retrieves all vouchers - voucher information found in this store.
  getVouchersFromShopDB: async (store_id, retailer_id) => {
    const getCouponsFromDBProcedure = "CALL get_coupons_by_store_id(?, ?)";

    const [queryError, queryResult] = await to(
      pool.promiseQuery(getCouponsFromDBProcedure, [store_id, retailer_id])
    );
    //get any possible error
    if (queryError) {
      console.log(queryError);
      return queryError;
    }

    const [resultSet] = queryResult;
    if (resultSet.length === 0) {
      return [];
    }
    const [{ valid_from }] = resultSet;
    const [{ coupon_id }] = resultSet;

    console.log("Hello");
    console.log(
      moment(new Date(valid_from))
        .format("YYYY-MM-DD")
        .toString()
    );
    module.exports.filterRedeemableVouchers(resultSet);
    return resultSet;
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

  //takes all the vouchers of a particular shop and decides which ones are redeemable and updates
  //the redeemable value of the particular voucher
  filterRedeemableVouchers: vouchersArray => {
    for (voucher in vouchersArray) {
      // var voucher = vouchersArray[voucher];
      console.log("st");
      console.log(vouchersArray[voucher]);
      console.log("fin");
      // const [
      //   {
      //     is_redeem_allowed,
      //     number_of_usage,
      //     max_number_allowed,
      //     valid_from,
      //     valid_until
      //   }
      // ] = voucher;
      //check if its not redeemable
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
        var not_redeemable = {
          type: "Buffer",
          data: [0]
        };
        vouchersArray[voucher].is_redeem_allowed = not_redeemable;
      }
    }
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

  /**
   *
   *
   * The particular method receives voucher id and removes it from the particular store by updating the redeemable field
   *
   * @return Whether the voucher was deleted from the store
   * @throws Error (500) System Failure.
             Error (401) Authentication failed
             Error (404) voucher was not found in store


   */

  deleteVoucherFromShop: async (req, res, next) => {
    //TODO uncomment authorization
    // //authorization if store id is managed from user id
    // var authorized = module.exports
    //   .checkAuthorization(
    //     req.userData.id,
    //     req.userData.role,
    //     req.params.storeId
    //   )

    var authorized = true;

    if (authorized) {
      //check if voucher exists in store
      await module.exports
        .checkVoucherExistenceAndRedeemability(
          req.params.voucherId,
          req.params.storeId,
          req.userData.id
        )
        .then(async voucher_id => {
          //if its reaches in this point of the execution then we can delete the voucher from the store
          try {
            //make coupon unredeemable
            await module.exports.makeCouponUnredeemable(voucher_id);
            console.log("Finished");
            return res.status(200).json({
              message: "Voucher deleted successfully"
            });
          } catch (err) {
            return res.status(500).json({
              message: "Error when trying to make coupon unredeemable"
            });
          }
        })
        .catch(err => {
          if (err === 0) {
            return res.status(500).json({
              message:
                "Error with DB when trying to delete voucher after checking that the voucher exists"
            });
          } else if (err === 1) {
            return res.status(404).json({
              message: "Voucher was not found"
            });
          } else if (err === 2) {
            return res.status(404).json({
              message: "Voucher is already deleted-unredeemable"
            });
          }
        });
    } else {
      return res.status(401).json({
        message: "Authentication failed, user has no access in this store"
      });
    }
  },

  deleteVoucherCode: (req, res, next) => {},

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
  },

  generateVoucherCode: () => {
    let r = Math.random()
      .toString(36)
      .substr(2, 5);
    return r;
  },

  //This method accepts the details of a voucher to be created. If the retailer has
  //aslready provided a voucher code it uses the particular code
  //if the retailer did not specify a code the funciton uses recursion to Find
  //a new code in order to input it in the DB.
  addVoucherToShopDB: async (
    value,
    isPercentage,
    startDate,
    endDate,
    couponCode,
    max_number_allowed,
    storeId,
    retailer_id,
    dbTransactionInstance
  ) => {
    let voucherCode;
    //if retailer did not provide a voucher code generate a unique code
    if (couponCode.length === 0) {
      voucherCode = module.exports.generateVoucherCode();
    } else {
      voucherCode = couponCode;
    }

    console.log(endDate);
    //create coupon
    const addVoucherToCart =
      "CALL add_voucher_to_shop(?, ?, ?, ?, ?, ?, ?, ?, ?)";

    console.log("Hey");
    console.log(
      moment(new Date(startDate))
        .format("YYYY-MM-DD")
        .toString()
    );

    const [queryError, queryResult] = await to(
      dbTransactionInstance.query(addVoucherToCart, [
        moment(new Date())
          .format("YYYY-MM-DD")
          .toString(),
        value,
        isPercentage,
        moment(new Date(startDate))
          .format("YYYY-MM-DD")
          .toString(),
        moment(new Date(endDate))
          .format("YYYY-MM-DD")
          .toString(),
        voucherCode,
        max_number_allowed,
        storeId,
        retailer_id
      ])
    );
    //get any possible error
    if (queryError) {
      if (queryError.errno === 1062) {
        if (couponCode.length !== 0) {
          console.log(queryError);
          return queryError;
        } else {
          await module.exports.addVoucherToShopDB(
            value,
            isPercentage,
            startDate,
            endDate,
            "",
            max_number_allowed,
            storeId,
            retailer_id,
            dbTransactionInstance
          );
        }
      }
    }

    if (queryError) {
      await dbTransactionInstance.rollbackAndReleaseConn();
      return queryError;
    }
    console.log(queryResult);
    const [resultSet] = queryResult;

    var result = await module.exports.createStoreCouponConnection(
      resultSet[0].coupon_id,
      storeId,
      dbTransactionInstance
    );

    if (result instanceof Error) {
      await dbTransactionInstance.rollbackAndReleaseConn();
      return result;
    }
    return resultSet;
  },

  createStoreCouponConnection: async (
    coupon_id,
    store_id,
    dbTransactionInstance
  ) => {
    const addVoucherStore = "CALL add_voucher_to_shop_coupon_connection(?, ?)";

    const [queryError, queryResult] = await to(
      dbTransactionInstance.query(addVoucherStore, [store_id, coupon_id])
    );
    //get any possible error
    if (queryError) {
      return queryError;
    }

    //this means that the user has an active cart that belongs to the shop and the
    // result set holds the products of the cart with the cart id
    return;
  },

  deleteVoucherFromStore: async (voucherId, storeId) => {
    var deleteVoucherFromStore = "CALL delete_voucher_from_store(?, ?)";
    return (voucherId = await new Promise((resolve, reject) => {
      pool.query(
        deleteVoucherFromStore,
        [storeId, voucherId],
        (err, result) => {
          if (err) {
            reject(500);
          } else {
            //the voucher was successfuly deleted
            resolve();
          }
        }
      );
    }));
  },

  makeCouponUnredeemable: async couponId => {
    var updateCouponRedeemability = "CALL update_coupon_redeemable(?)";
    await new Promise((resolve, reject) => {
      pool.query(updateCouponRedeemability, [couponId], (err, result) => {
        if (err) {
          reject();
        } else {
          console.log("Starts");
          //the coupon was successfuly made unredeemable
          resolve();
        }
      });
    });
  }
};
