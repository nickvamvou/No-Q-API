const redis = require('redis');
const client = redis.createClient();


client.on('connect', () => {
  console.log('Redis client connected');
});

client.on('error', (err) => {
  console.log(`Something went wrong ${err}'`);
});

client.promiseGet = (key) => new Promise((resolve, reject) => {
  client.get(key, (error, result) => {
    if (error) {
      return reject(error);
    }

    resolve(result);
  });
});


module.exports = client;
