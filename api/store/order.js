//This file includes all the functionality handling the orders of a store
const to = require("await-to-js").default;
const createHttpError = require("http-errors");
const fs = require("fs");
const util = require("util");
const pool = require("../../config/db_connection");
const role = require("../user/user-role");
const utils = require("../utils");
const moment = require("moment");
const { SqlError, databaseUtil } = require("../utils");

module.exports = {
  /**
   * The particular method receives an order_id and specific_products_refunded
   * and refunds the user made the order based on the price of the items
   * @return Whether the refund was successfully completed
   *
   */
  refundOrder: async (
    {
      params: { storeId, orderId },
      body: { specific_products_refunded },
      userData: { id: userId }
    },
    res,
    next
  ) => {
    const { dbTransactionInstance } = res.locals;

    //create refund object

    //create a refund object and store the refund id
    var refundId = await module.exports.createRefund(
      dbTransactionInstance,
      storeId,
      userId,
      orderId
    );

    //there was a problem deleting the cart
    if (refundId instanceof Error) {
      await dbTransactionInstance.rollbackAndReleaseConn();
      return next(
        createHttpError(500, "Error when trying to create a refund entry")
      );
    }

    //loop through the products to be refunded
    specific_products_refunded.forEach(product => {});
  },

  /*
  ************************************************** HELPER FUNCTIONS **************************************************
  */

  /**
   * The particular method creates a refund ENTRY, by checking whether the store and order belongs to the
   * user submitting the request
   * and refunds the id of the refund created in the database
   * @return the id of the refund
   *
   */

  createRefund: async (dbTransactionInstance, storeId, userId, orderId) => {
    const createRefundProcedure = "CALL create_refund(?,?,?)";
    var refundTime = moment(new Date())
      .format("YYYY/MM/DD hh:mm:ss")
      .toString();
    let [queryError, queryResult] = await to(
      dbTransactionInstance.query(createRefundProcedure, [
        refundTime,
        storeId,
        userId,
        orderId
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
  }
};
