/*
 * Helper functions for user API
 */
const createHttpError = require("http-errors");
const jwt = require("jsonwebtoken");
const to = require('await-to-js').default;

const cacheRegister = require('../../config/cache_register');
const key = require("../../config/jwt_s_key");
const mailer = require('../../config/mailer');


/**
 * This method handles general functionality for initiating
 * password reset for all user types.
 *
 * @param req - express request object containing information about the request - payload, route params, etc
 * @param res - express response object
 * @param next - function that forwards processes to the next express handler or middleware
 */
const initiateResetPassword = async ({ body: { email }, referenceName }, res, next) => {
  const [jwtError, token] = await to(
    util.promisify(jwt.sign)({ email, referenceName }, key.jwt_key, { expiresIn: '1h' })
  );

  // Forward fatal error to global error handler
  if (jwtError) {
    return next(createHttpError(500, jwtError));
  }

  // Save generated token for resetting password to cache register, to expire in an hour
  cacheRegister.set(`forgot-pass-token-${email}`, token, 'EX', 60 * 60);

  // Configure mailer options
  const mailOptions = {
    to: email,
    from: 'no-q@info.io',
    template: 'forgot-password',
    subject: 'Password help has arrived!',
    context: {
      url: `http://localhost:3000/user/reset-password?token=${token}`,
      name: referenceName,
    }
  };

  // Send mail
  const [mailerError] = await to(mailer.sendEmail(mailOptions));

  // Forward fatal error to global error handler
  if (mailerError) {
    return next(createHttpError(500, mailerError.message));
  }

  // Dish out success message
  return res.status(200).json({
    message: 'A link to reset your password has been sent to your email',
  });
};


module.exports = {
  initiateResetPassword,
};
