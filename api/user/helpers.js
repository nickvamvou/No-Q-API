/*
 * Helper functions for user API
 */
const createHttpError = require("http-errors");
const jwt = require("jsonwebtoken");
const to = require('await-to-js').default;
const util = require('util');

const { cache, mailer } = require('api/config');


/**
 * This request handler generates reset password token, saves
 * it to cache for future validation. Finally, it forwards request
 * to the next handler.
 *
 * @param req - express request object containing information about the request - payload, route params, etc
 * @param `res` [Object] - Express's HTTP response object.
 * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
 */
exports.generatePassResetToken = async (req, res, next) => {
  const { body: { email } } = req;
  const { locals: { referenceName } } = res;
  const [jwtError, token] = await to(
    util.promisify(jwt.sign)({ email, referenceName }, process.env.JWT_SALT_KEY, { expiresIn: '1h' })
  );

  // Forward fatal error to global error handler
  if (jwtError) {
    return next(createHttpError(500, jwtError));
  }

  // Save generated token for resetting password to cache register, to expire in an hour
  cache.set(`forgot-pass-token-${email}`, token, 'EX', 60 * 60);

  // Pass on generated token to next handler.
  req.locals.resetPassToken = token;

  // Continue to next handler or middleware.
  next();
};

/**
 * This request handler receives information necessary for password reset
 * and then sends it via email to user's email.
 *
 * @param `email` [String] - Email of user requesting password reset.
 * @param `res` [Object] - Express's HTTP response object.
 * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
 */
exports.sendPassResetMail = async ({ body: { email } }, res, next) => {
  // Collect local request data provided by prior handlers or middlewares.
  const { locals: { referenceName, resetPassToken } } = res;
  // Configure mailer options
  const mailOptions = {
    to: email,
    from: 'no-q@info.io',
    template: 'forgot-password',
    subject: 'Password help has arrived!',
    context: {
      url: `http://localhost:3000/user/reset-password?token=${resetPassToken}`,
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
