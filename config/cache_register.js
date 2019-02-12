/**
 * Cache register powered by REDIS
 */

const redis = require('redis');
const util = require('util');


// Create new client
const client = redis.createClient();

client.on('connect', () => {
  console.log('Redis client connected');
});

client.on('error', (err) => {
  console.log(`Something went wrong ${err}'`);
});

client.get = util.promisify(client.get);


module.exports = client;
