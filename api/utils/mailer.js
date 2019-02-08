const nodemailer = require('nodemailer');
const to = require('await-to-js').default;

const readFile = require('./file_reader');


const createTransport = async (options = {}) => {
  const  account = await nodemailer.createTestAccount();
  const defaultOptions = {
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: account.user, // generated ethereal user
      pass: account.pass // generated ethereal password
    }
  };

  return nodemailer.createTransport(options, defaultOptions);
};

const sendEmail = async ({ templateName, ...options }) => {
  const [err, transporter] = await to(createTransport());
  const { html } = options;

  if (!html && templateName) {
    const [err, htmlTemplate] = await to(readFile(templateName));

    if (err) {
      throw new Error('Could not find specified email template. Please provide a valid file path')
    }

    options.html = htmlTemplate;
  }

  return transporter.sendMail(options);
};


module.exports = {
  createTransport,
  sendEmail,
};
