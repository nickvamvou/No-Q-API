const kue = require('kue');


const queue = kue.createQueue({
  redis: process.env.REDIS_URL,
});

queue.watchStuckJobs();


module.exports = queue;
