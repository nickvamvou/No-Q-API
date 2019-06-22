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
  const [ storeError ] = await to(kvStore.setAsync(payload.id, refreshToken, 'EX', 604800));

  if (storeError) {
    throw storeError;
  }

  return refreshToken;
};

exports.createAccessToken = async (payload, options) => {
  const defaultSigningOptions = {
    subject: payload.id.toString(),
    expiresIn: process.env.JWT_TOKEN_EXPIRES_IN || '15m',
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

exports.verifyAccessToken = async (token) => {
  const [ error, decoded ] = await to(
    jwt.verify(token, process.env.JWT_SECRET_KEY)
  );

  if (error) {
    throw error;
  }

  return decoded;
};
