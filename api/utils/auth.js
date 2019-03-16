const util = require('util');
const jwt = require('jsonwebtoken');
const to = require("await-to-js").default;

const crypto = require('./crypto');
const kvStore = require('../../config/cache_register');


jwt.sign = util.promisify(jwt.sign);
jwt.verify = util.promisify(jwt.verify);


exports.createRefreshToken = async (payload) => {
  const [ encryptionError, refreshToken ] = await to(crypto.encrypt(JSON.stringify(payload)));

  if (encryptionError) {
    throw encryptionError;
  }

  // Save refresh token to key value store for future authentication. Token will expire in 7 days.
  const [ storeError ] = await to(kvStore.setAsync(payload.userId, refreshToken, 'EX', 604800));

  if (storeError) {
    throw storeError;
  }

  return refreshToken;
};

exports.createAccessToken = async (payload, options) => {
  const defaultSigningOptions = {
    subject: payload.userId.toString(),
    expiresIn: '20m',
    issuer: 'NoQGroup',
  };

  const [ error, jwtToken ] = await to(
    jwt.sign(payload, process.env.JWT_SECRET_KEY, { ...defaultSigningOptions, ...options })
  );

  if (error) {
    throw error;
  }

  const [ jwtVerificationErr, { iat, exp } = {} ] = await to(
    jwt.verify(jwtToken, process.env.JWT_SECRET_KEY)
  );

  if (jwtVerificationErr) {
    throw jwtVerificationErr;
  }

  return { token: jwtToken, iat: iat * 1000, exp: exp * 1000 };
};
