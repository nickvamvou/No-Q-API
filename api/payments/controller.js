const queue = require('../../config/queue');
const { createPurchase, createJobFailureEmailSender } = require('./helpers');


/**
 *
 * Creates a queued background job that is responsible for
 * creating purchases and reporting errors that might show up
 * in the process.
 *
 * Queued background job processing is powered by [Kue](https://github.com/Automattic/kue)
 *
 * @param req - express request object containing information about the request
 * @param res - express response object
 *
 */
exports.createPurchaseCreatorJob = (req, res) => {
  // Specifies unique job name for all purchase creator jobs.
  const jobName = 'CREATE_CUSTOMER_PURCHASE';

  // Specifies number of max active jobs at any time. Concurrency value.
  // const maxActiveJobs = 20;

  // Specifies job's level of attention and preference .
  const jobPriority = 'high';

  // Specifies max number of chances for this job to succeed.
  const jobMaxAttempts = 5;

  // Grab payload to be processed -- actual data we care about
  const { body: payload } = req;

  // Bump up queue event listeners to make room for job concurrency.
  // queue.setMaxListeners(queue.getMaxListeners() + maxActiveJobs);

  // Create queued background job to create customer purchase.
  const job = queue
    .create(jobName, payload)
    .priority(jobPriority) // Give this job all the attention it needs when the time comes for it.
    .attempts(jobMaxAttempts) // Job will have 5 chances to succeed.
    .backoff({ delay: (60 * 5) * 1000, type: 'exponential' }) // Space out job attempts scientifically
    .save();

  // On a failed attempt, notify NoQ
  job.on('failed attempt', createJobFailureEmailSender({ job }));

  // Finally, attempts exhausted, and purchase is still not created successfully, then notify stakeholders of dreadful
  // event :(
  job.on('failed', createJobFailureEmailSender({ job }));

  // Fire up the `createPurchase` process(worker function) in the background
  // with the ability to run up to `20` active jobs of this type at a time.
  // Chop Chop!
  queue.process(jobName, createPurchase);

  // Job registered OK ;), see all jobs and their corresponding statuses on the queue dashboard
  // using the `queueDashboardLink` provided in the response below.
  res.json({
    message: 'Purchase is now being created in the background 💪!!! Go brew some ☕️',
    queueDashboardLink: `${req.headers.host}/queue-dashboard`,
  });
};

/**
 *
 * Creates a queued background job that is responsible for
 * processing order refunds, and also reporting errors that might show up
 * in the process.
 *
 * Queued background job processing is powered by https://github.com/Automattic/kue
 *
 * @param req - express request object containing information about the request
 * @param res - express response object
 *
 */
exports.createRefundProcessorJob = (req, res) => {
  // Specify unique job name for all refund processing jobs.
  const jobName = 'PROCESS_ORDER_REFUND';

  const { body: payload } = req;

  // TODO: Create `PROCESS_ORDER_REFUND` job here.

  // Job registered OK ;), see all jobs and their corresponding states on the queue dashboard
  // using the link `queueDashboardLink` provided in the response below.
  res.json({
    message: 'Order refund is now being processed in the background 💪!!! Go brew some ☕️',
    queueDashboardLink: `${req.headers.host}/queue-dashboard`,
  });
};
