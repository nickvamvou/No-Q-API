// TODO: Kue is no longer maintained. Use Bull as an alternative.
const kue = require('kue');

const queue = kue.createQueue({
  redis: `${process.env.REDIS_URL}?${process.env.REDIS_PASS && `password=${process.env.REDIS_PASS}`}`,
});

queue.watchStuckJobs();


module.exports = queue;
