const { databaseUtil } = require("../utils");
const pool = require("../../config/db_connection");
const mailer = require("../../config/mailer");


/**
 *
 * Creates and configures an email sender to notify NoQ of
 * errors and fatalities while processing a queued background job.
 *
 * @param job - created background job data
 * @param mailOptions - email config
 * @returns {Function} - Actual email sender function
 *
 */
exports.createJobFailureEmailSender = ({ job, mailOptions = {} }) => async (errorMessage, doneAttempts) => {
  // Try sending queued job failure report and handle error(s) gracefully.
  try {
    // Configure mailer options
    const defaultMailOptions = { // TODO: Use appropriate emails
      to: 'bolutife.lawrence@no-q.io',
      replyTo: "no-reply@no-q.io",
      template: "failed-job",
      subject: `Background job #${job.id}: ${job.type} failed due to 
      "Error: ${errorMessage}". Attempts(${doneAttempts} / 5)`, // TODO: Use max_attempts from the current job
      context: {
        doneAttempts,
        errorMessage,
      },
    };

    // Send the error report email
    await mailer.sendEmail({ ...defaultMailOptions, ...mailOptions });
  } catch (error) {
    // Log job error. See details on the queue dashboard.
    job.log('Could not send error report email -- ', error)
  }
};

/**
 *
 * Queue worker/processor function for creating customer purchases.
 *
 * @param job - job data
 * @param done - callback function to notify caller of error or success
 * @returns {Promise<*>} - ignored!
 *
 */
exports.createPurchase = async (job, done) => {
  // Make DatabaseTransaction instance available globally within this space.
  let dbTransaction;

  // Try initializing the DatabaseTransaction and handle error(s) gracefully.
  try {
    // Create a new instance of a DatabaseTransaction to be used by the rest of the function=.
    dbTransaction = await new databaseUtil.DatabaseTransaction(pool).init();
  } catch (error) {
    // Problem setting up a DatabaseTransaction. Notify caller and halt process ;(
    return done(error);
  }

  // DatabaseTransaction all set up! Try creating customer purchase and handle error(s) gracefully.
  try {
    const { billing_email: billingEmail, card_id: cardId, order_id: cartId } = job.data;

    // Begin new database transaction.
    await dbTransaction.begin();

    // Delete customer's active cart. TODO: Is this really necessary?
    const deletedCartResult = await dbTransaction.query('call delete_active_cart(?)', [ cartId ]);

    if (deletedCartResult.affectedRows === 0) {
      return done(Error(`Could not find cart`));
    }

    // Create payment for the purchase/order in question
    const [ [ { id: paymentId } ] ] = await dbTransaction.query('call create_payment(?,?)', [ cardId, cartId ]);

    // Create Purchase
    await dbTransaction.query('call create_purchase(?,?,?)', [ new Date(), paymentId, cartId ]);

    // Send purchase receipt to customer
    const mailConfig = { // TODO: Use appropriate emails
      to: billingEmail,
      template: "customer-purchase-receipt",
      subject: 'Purchase Receipt',
      context: {},
    };

    // Send mail
    await mailer.sendEmail(mailConfig);

    // Make database changes so far persistent. Commit it! Put a ring on it! ;)
    await dbTransaction.commit();

    // Ah! Everything looks sharp! Relay good news to caller.
    done();
  } catch (error) {
    // Oh! Something didn't work as planned. Rollback any DatabaseTransaction changes if any.
    await dbTransaction.rollback();

    // Notify caller about this dreadful situation ;(
    done(error);
  } finally {
    // Finally, DB connection has served its purpose. Release it back into the pool.
    await dbTransaction.releaseConn();
  }
};
