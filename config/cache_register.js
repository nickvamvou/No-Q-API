const redis = require('redis');
const client = redis.createClient();
const util = require('util');


client.on('connect', () => {
  console.log('Redis client connected');
});

client.on('error', (err) => {
  console.log(`Something went wrong ${err}'`);
});

client.get = util.promisify(client.get);


module.exports = client;
