// Converge all app config into a single & easy-to-use object

module.exports = {
  googleOauth2: require('./google').oauth2,
  googleKeys: require('./google').Keys,
  cache: require('./cache'),
  dbConnPool: require('./db_connection'),
  mailer: require('./mailer'),
  privateRoutes: require('./private_routes'),
};
