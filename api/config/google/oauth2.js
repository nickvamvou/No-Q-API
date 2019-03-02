/*
  Google OAuth2 module
 */

const { OAuth2Client } = require('google-auth-library');

const keys = require('./keys');


// Create a new instance of oAuth client with necessary credentials.
exports.authClient = new OAuth2Client(
  keys.web.client_id,
  keys.web.client_secret,
);
