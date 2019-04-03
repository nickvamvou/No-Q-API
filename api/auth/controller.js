const createHttpError = require("http-errors");
const to = require('await-to-js').default;

const kvStore = require('../../config/cache_register');
const { auth, crypto } = require('../utils');


exports.getAccessToken = async ({ body: { refreshToken }, headers: { authorization } }, res, next) => {
  const [ authType, base64Credentials ] = authorization.split(' ');

  if (authType !== 'Basic' || !base64Credentials) {
    return next(createHttpError(401, 'Please provide proper authorization header'));
  }

  let decodedAuthCred = null;

  try {
    decodedAuthCred = JSON.parse(Buffer.from(base64Credentials, 'base64').toString());
  } catch (exception) {
    throw exception;
  }

  const { userId } = decodedAuthCred;

  const [ error, encryptedToken ] = await to(kvStore.getAsync(userId));

  if (error) {
    return next(createHttpError(error));
  }

  if (!encryptedToken) {
    return next(createHttpError(404, 'Refresh token doesn\'t exist.'));
  }

  if (refreshToken !== encryptedToken) {
    return next(createHttpError('Invalid refresh token'));
  }

  const [ decryptionError, decryptedToken ] = await to(crypto.decrypt(encryptedToken));

  if (decryptionError) {
    return next(createHttpError(decryptionError));
  }

  const userInfo = JSON.parse(decryptedToken);

  if (userInfo.id !== userId) {
    return next(createHttpError(503, 'UserID and refresh token do not belong to the same user.'));
  }

  const [ tokenCreationError, accessToken ] = await to(auth.createAccessToken(userInfo));

  if (tokenCreationError) {
    return next(createHttpError(tokenCreationError));
  }

  res.json({
    refreshToken,
    accessToken,
  })
};
