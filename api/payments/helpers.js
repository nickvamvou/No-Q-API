const to = require("await-to-js").default;

const mailer = require("../../config/mailer");


exports.notifyStakeholdersOfFailedPurchaseAttempt = (job) => async (errorMessage, doneAttempts) => {
  // TODO: For debugging sakes. Remove afterwards!
  console.log(`Failed Attempt Count: ${doneAttempts}`, `Reason: ${errorMessage}`);

  // Configure mailer options
  const mailOptions = { // TODO: Use appropriate emails
    bcc: 'support@no-q.io',
    to: 'store@example.com',
    from: "sender@example.com",
    template: "forgot-password",
    subject: "Could not create purchase details for this customer",
    context: {} // TODO: Pass appropriate context data to email template, data like `doneAttempts` and `errorMessage`
  };

  let error;

  // Send mail
  [ error ] = await to(mailer.sendEmail(mailOptions));

  if (error) {
    job.log('Could not notify store and NoQ of failed attempt to create purchase -- ', error)
  }
};
