/*
  Controller for all things support
 */
const createHttpError = require("http-errors");
const to = require('await-to-js').default;

const { dbConn, mailer } = require("api/config");
const { SqlError } = require('api/utils');


/**
 *
 * This endpoint handler sends a support message to the NoQ team.
 * It accepts a message type and content as request payload
 * and sends it over to specified NoQ support email.
 *
 * Alternative flows:
 *
 * - If an error occurs while getting user `email` from DB, execution is halted,
 *   and `SqlError` is forwarded to central error handler.
 *
 * - If an error occurs while sending email, execution is halted,
 *   and `mailerError` is forwarded to central error handler with status code `500`.
 *
 *
 * @param `body` [Object] - Actual request payload(req.body) to be passed to email template.
 * @param `body.type` [String] - The type of message to be sent to NoQ support email (Feedback, Bug, etc).
 * @param `body.content` [String] - Text information about the message. Message content.
 * @param `userId` [Number] - The `uid` of currently authenticated user.
 * @param `res` [Object] - Express's HTTP response object.
 * @param `next` [Function] - Express's forwarding function for moving to next handler or middleware.
 *
 */
const sendMessage = async ({ body, userData: { id: userId } }, res, next) => {
  // Retrieve user email from database.
  const [queryError, [[email]]] = await to(dbConn.promiseQuery('CALL get_user_email_by_id(?)', [userId]));

  // Database error occurred while getting user `email`. Forward `SqlError` to central error handler.
  if (queryError) {
    return next(createHttpError(new SqlError(queryError)));
  }

  // Configure mailer options
  const mailOptions = {
    to: 'info@no-q.io',
    from: email,
    template: 'feedback',
    subject: `New ${body.type} alert!`,
    context: body
  };

  // Send mail
  const [mailerError] = await to(mailer.sendEmail(mailOptions));

  // Forward fatal `mailerError` to global error handler
  if (mailerError) {
    return next(createHttpError(500, mailerError.message));
  }

  // Send success message
  res.status(200).json({
    message: 'Thank you for reaching out! The NoQ support team has been notified.'
  })
};


module.exports = {
  sendMessage,
};
