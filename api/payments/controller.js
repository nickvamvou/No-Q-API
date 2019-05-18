const path = require('path');
const to = require("await-to-js").default;

const { databaseUtil } = require("../utils");
const pool = require("../../config/db_connection");
const queue = require('../../config/queue');
const { notifyStakeholdersOfFailedPurchaseAttempt } = require('./helpers');


/**
 * This particular method spits out CCA's getRSA file
 *
 * @param req - express request object containing information about the request
 * @param res - express response object
 */
exports.getRSAFile = async (req, res) => {
  // Send static HTML file.
  res.sendFile(path.resolve('./api/payments/cca/getRSA.jsp'));
};

/**
 * This particular method spits out CCA's responseHandler file
 *
 * @param req - express request object containing information about the request
 * @param res - express response object
 */
exports.getResponseHandlerFile = async (req, res) => {
  // Send static HTML file.
  res.sendFile(path.resolve('./api/payments/cca/responseHandler.jsp'));
};

/**
 *
 * This method handles payment requests for CCA via
 * Dynamic Event Notification -- web hooks.
 *
 * @param req - express request object containing information about the request
 * @param res - express response object
 *
 */
exports.createPurchase = ({ body: payload }, res) => {
  const jobName = 'create-purchase';

  // Create queued background process to create customer details
  const job = queue
    .create(jobName, payload)
    .priority('high')
    .attempts(5)
    .backoff({ delay: (60 * 5) * 1000, type: 'exponential' })
    .save();

  /**
   * TODO: On failed attempt, send email to store's support team in question and blind-copy NoQ's support as well
   * notifying them of the failed attempt to create customer purchase details.
   */
  job.on('failed attempt', notifyStakeholdersOfFailedPurchaseAttempt(job));

  // Attempt to create purchase details in the background
  queue.process(jobName, async (job, done) => {
    try {
      const { card_id: cardId, order_id: cartId } = job.data;
      let error, result, dbTransaction;

      [ error, dbTransaction ] = await to(
        new databaseUtil.DatabaseTransaction(pool).init()
      );

      if (error) {
        return done(error);
      }

      // Begin new database transaction.
      [ error ] = await to(dbTransaction.begin());

      // Error starting database transaction. Forward error!
      if (error) {
        return done(error);
      }

      [ error, result ] = await to(
        dbTransaction.query('call delete_active_cart(?)', [ cartId ])
      );

      if (error) {
        await dbTransaction.rollbackAndReleaseConn();

        return done(error);
      }

      if (result.affectedRows === 0) {
        await dbTransaction.rollbackAndReleaseConn();

        return done(new Error(`Could not find cart`));
      }

      [ error, result ] = await to(
        dbTransaction.query('call create_payment(?,?)', [ cardId, cartId ])
      );

      if (error) {
        await dbTransaction.rollbackAndReleaseConn();

        return done(error);
      }

      const [ [ { id: paymentId } ] ] = result;

      [ error ] = await to(
        dbTransaction.query('call create_purchase(?,?,?)', [ new Date(), paymentId, cartId ])
      );

      if (error) {
        await dbTransaction.rollbackAndReleaseConn();

        return done(error);
      }

      // Make database changes so far persistent. Commit it!
      [ error ] = await to(dbTransaction.commit());

      // If error occurs while persisting changes, rollback!
      if (error) {
        await dbTransaction.rollback();

        done(error);
      }

      // Finally, DB connection has served its purpose. Release it back into the pool.
      await dbTransaction.releaseConn();

      done();
    } catch (error) {
      done(error);
    }
  });

  res.json({
    message: 'Order payment is now being processed in the background 💪!!! Go brew some ☕️'
  });
};
