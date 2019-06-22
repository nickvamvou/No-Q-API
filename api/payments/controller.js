const queue = require('../../config/queue');
const { createPurchase, createJobFailureEmailSender } = require('./helpers');


/**
 *
 * Creates a queued background job that is responsible for
 * creating purchases and reporting errors that might show up
 * in the process.
 *
 * Queued background job processing is powered by https://github.com/Automattic/kue
 *
 * @param req - express request object containing information about the request
 * @param res - express response object
 *
 */
exports.createPurchaseCreatorJob = (req, res) => {
  // Specify unique job name for all purchase creator jobs.
  const jobName = 'CREATE_CUSTOMER_PURCHASE';

  const { body: payload } = req;

  // Create queued background process to create customer purchase.
  const job = queue
    .create(jobName, payload)
    .priority('high') // Give this job all the attention it needs when the time comes.
    .attempts(5) // Job will have 5 chances to succeed.
    .backoff({ delay: (60 * 5) * 1000, type: 'exponential' }) // Space out job attempts scientifically
    .save();

  // On a failed attempt, notify NoQ
  job.on('failed attempt', createJobFailureEmailSender({ job }));

  // Finally, attempts exhausted, and purchase is still not created successfully, then notify stakeholders of dreadful event :(
  job.on('failed', createJobFailureEmailSender({ job }));

  // Fire up the `createPurchase` process in the background! Chop Chop!
  queue.process(jobName, createPurchase);

  // Job registered OK ;), see all jobs and their corresponding states on the queue dashboard
  // using the link `queueDashboardLink` provided in the response below.
  res.json({
    message: 'Purchase is now being created in the background 💪!!! Go brew some ☕️',
    queueDashboardLink: `${req.headers.host}/queue-dashboard`,
  });
};

/**
 *
 * Creates a queued background job that is responsible for
 * creating order refunds, and also reporting errors that might show up
 * in the process.
 *
 * Queued background job processing is powered by https://github.com/Automattic/kue
 *
 * @param req - express request object containing information about the request
 * @param res - express response object
 *
 */
exports.createRefundCreatorJob = (req, res) => {
  // Specify unique job name for all refund processing jobs.
  const jobName = 'PROCESS_ORDER_REFUND';

  const { body: payload } = req;

  // Job registered OK ;), see all jobs and their corresponding states on the queue dashboard
  // using the link `queueDashboardLink` provided in the response below.
  res.json({
    message: 'Order refund is now being processed in the background 💪!!! Go brew some ☕️',
    queueDashboardLink: `${req.headers.host}/queue-dashboard`,
  });
};
