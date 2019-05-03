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
      body: { specific_products_ids_refunded },
      userData: { id: userId }
    },
    res,
    next
  ) => {
    const { dbTransactionInstance } = res.locals;

    //create a refund object and store the refund id
    //refund information includes the following
    //`refundId` from the entry created, card token to send the refund
    var refundInformation = await module.exports.createRefund(
      dbTransactionInstance,
      storeId,
      userId,
      orderId
    );

    //if there was a problem with creating a refund object
    if (refundInformation instanceof Error) {
      console.log("DONT");
      await dbTransactionInstance.rollbackAndReleaseConn();
      return next(
        createHttpError(500, "Error when trying to create a refund entry")
      );
    }

    var refund_amount = await module.exports.refundIndividualProductId(
      dbTransactionInstance,
      refundInformation.id,
      orderId,
      specific_products_ids_refunded
    );

    if (refund_amount instanceof Error) {
      await dbTransactionInstance.rollbackAndReleaseConn();
      return next(
        createHttpError(500, "Error when trying to refund individual product")
      );
    }

    //TODO IF REACHED TILL THIS FAR SEND THE AMOUNT `refound_amount` to the card token `refundInformation.card_token`

    // Pass final response object to DB transaction middleware.
    res.locals.finalResponse = {
      message: "Refund completed",
      data: {
        refund_id: refundInformation.id,
        amount_refunded_aed: refund_amount
      }
    };

    next();
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
    const createRefundProcedure = "CALL create_refund(?,?,?,?)";
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
      console.log(queryError);
      return queryError;
    } else if (queryResult.length === 0) {
      return new Error();
    } else {
      const [resultSet] = queryResult;
      const [refund_information] = resultSet;
      //return the refund id
      return refund_information;
    }
  },

  refundIndividualProductId: async (
    dbTransactionInstance,
    refundId,
    orderId,
    specific_products_ids_refunded
  ) => {
    //that is the total amount to be refunded to the customer
    let amount_of_refund = 0;
    //check for error when refunding
    let error_refund = false;

    for (var i = 0; i < specific_products_ids_refunded.length; i++) {
      //entry the product id and refund id to the database and retrive the price to be refunded
      var price_of_product_to_be_refunded = await module.exports.refundIndividualProductIdDB(
        dbTransactionInstance,
        refundId,
        specific_products_ids_refunded[i],
        orderId
      );
      //if that could not be performed return error
      if (price_of_product_to_be_refunded instanceof Error) {
        console.log(price_of_product_to_be_refunded);
        error_refund = true;
        break;
      }

      amount_of_refund = amount_of_refund + price_of_product_to_be_refunded;
    }

    if (error_refund) {
      console.log("error");
      return new Error();
    } else {
      console.log("END : " + amount_of_refund);
      return amount_of_refund;
    }
  },

  /**
   * The particular method refunds individual products by creating an entry in the refund_products table
   * Receives the refund_id entry  and the id of the product to be refunded. The particular method also updates the quantity
   * of the product details refunded
   * Returns the price of the product to be refunded
   * @return the price of the product to be refunded
   *
   */
  refundIndividualProductIdDB: async (
    dbTransactionInstance,
    refund_id,
    product_to_refund_id,
    orderId
  ) => {
    const createRefundProcedureForIndividualProduct =
      "CALL create_refund_based_on_product_id(?,?,?)";
    //adjust the database to refund specific product
    let [queryError, queryResult] = await to(
      dbTransactionInstance.query(createRefundProcedureForIndividualProduct, [
        refund_id,
        product_to_refund_id,
        orderId
      ])
    );
    if (queryError) {
      return queryError;
    } else if (queryResult.length === 0) {
      return new Error();
    } else {
      const [resultSet] = queryResult;
      console.log(resultSet);

      const [product_price] = resultSet;

      //return the product price refunded
      return product_price.product_price;
    }
  }
};
