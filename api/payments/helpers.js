const to = require("await-to-js").default;

const { databaseUtil } = require("../utils");
const pool = require("../../config/db_connection");
const mailer = require("../../config/mailer");


exports.notifyStakeholdersOfPurchaseCreationFailure = ({ job, mailOptions = {} }) => async (errorMessage, doneAttempts) => {
  // Configure mailer options
  const defaultMailOptions = { // TODO: Use appropriate emails
    to: 'bolutife.lawrence@no-q.io',
    replyTo: "no-reply@no-q.io",
    template: "failed-job",
    subject: `Background job #${job.id}: ${job.type} failed due to "Error: ${errorMessage}". Attempts(${doneAttempts} / 5)`, // TODO: Use max_attempts from the current job
    context: {
      doneAttempts,
      errorMessage,
    },
  };

  let error;

  // Send mail
  [ error ] = await to(mailer.sendEmail({ ...defaultMailOptions, ...mailOptions }));

  if (error) {
    job.log('Could not notify stakeholders of failed attempt to create purchase -- ', error)
  }
};

exports.createPurchase = async (job, done) => {
  try {
    const { billing_email: billingEmail, card_id: cardId, order_id: cartId } = job.data;
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

    // Send purchase receipt to customer
    const mailOptions = { // TODO: Use appropriate emails
      to: billingEmail,
      template: "customer-purchase-receipt",
      subject: 'Purchase Receipt',
      context: {},
    };

    // Send mail
    [ error ] = await to(mailer.sendEmail(mailOptions));

    if (error) {
      await dbTransaction.rollbackAndReleaseConn();

      done(error);
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
};
