/**
 * This module contains Product derails controllers
 */

const to = require('await-to-js').default;
const pool = require('../../config/db_connection');
const createHttpError = require('http-errors');

const { SqlError } = require('../utils');


/**
 * This particular method updates details of a particular product.
 *
 * @param req - request object containing information about payload, route params, and other information
 * @param res - response object
 * @param next
 */
const updateProductDetails = async (req, res, next) => {
  // Executes update query against Db via a stored procedure to update necessary information.
  const [queryError, queryResult] = await to(pool.promiseQuery('CALL update_product_details(?, ?, ?, ?, ?, ?)', [
    req.params.productDetailsId,
    req.body.name,
    req.body.weight,
    req.body.stock,
    req.body.description,
    req.body.retailerProductId,
  ]));

  // Forward fatal error to global error handler
  if (queryError) {
    return next(createHttpError(500, new SqlError(queryError)));
  }

  // Responds with information for updated product details.
  res.status(200).json(queryResult);
};


module.exports = {
  updateProductDetails,
};
