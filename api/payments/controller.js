const path = require('path');

const queue = require('../../config/queue');
const { createPurchase, notifyStakeholdersOfPurchaseCreationFailure } = require('./helpers');


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
exports.createPurchaseCreationJob = ({ body: payload }, res) => {
  const jobName = 'Create customer purchase';

  // Create queued background process to create customer details
  const job = queue
    .create(jobName, payload)
    .priority('high')
    .attempts(5)
    .backoff({ delay: (60 * 5) * 1000, type: 'exponential' })
    .save();

  // On failed attempt, notify NoQ
  job.on('failed attempt', notifyStakeholdersOfPurchaseCreationFailure({ job }));

  // Finally, after set attempts, and purchase is still not created successfully, then notify stakeholders of fatality
  job.on('failed', notifyStakeholdersOfPurchaseCreationFailure({ job }));

  // Attempt to create purchase details in the background
  queue.process(jobName, createPurchase);

  res.json({
    message: 'Purchase is now being created in the background 💪!!! Go brew some ☕️'
  });
};

/**
 *
 * This method handles refund status notifications from CCA via
 * Dynamic Event Notification -- web hooks.
 *
 * @param req - express request object containing information about the request
 * @param res - express response object
 *
 */
exports.createRefundCreationJob = ({ body: payload }, res) => {
  res.json({
    message: 'Refund is now being created in the background 💪!!! Go brew some ☕️',
  });
};
