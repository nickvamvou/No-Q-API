const path = require('path');
const queue = require('../../config/queue');


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
exports.payForOrder = async ({ body: payload }, res) => {
  const paymentBgJobName = 'order-payment';

  queue
    .create(paymentBgJobName, payload)
    .priority('high')
    .attempts(5)
    .backoff({ delay: (60 * 5) * 1000, type: 'exponential' })
    .save();

  queue.process(paymentBgJobName, (job, done) => {
    // TODO: Code order payment functionality here
    job.log('order payment processing');
    done();
    job.log('order payment processing complete')
  });

  res.json({
    message: 'Order payment is now being processed'
  });
};
