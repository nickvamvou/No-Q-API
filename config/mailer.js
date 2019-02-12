/**
 * Mailer module
 */

const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const util = require('util');
const path = require('path');


// Create transporter for sending emails
const transporter = nodemailer.createTransport(process.env.NODE_MAILER_CONN_URL);

const handlebarsOptions = {
  viewEngine: 'handlebars',
  viewPath: path.resolve('./public/templates/'),
  extName: '.html'
};

// Setup nodemailer's transporter to use handlebars as a template engine
transporter.use('compile', hbs(handlebarsOptions));

transporter.sendEmail = util.promisify(transporter.sendMail);


module.exports = transporter;
