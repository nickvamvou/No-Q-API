const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const util = require('util');
const path = require('path');


const transporter = nodemailer.createTransport(process.env.NODE_MAILER_CONN_URL);

const handlebarsOptions = {
  viewEngine: 'handlebars',
  viewPath: path.resolve('./public/templates/'),
  extName: '.html'
};

transporter.use('compile', hbs(handlebarsOptions));

transporter.sendEmail = util.promisify(transporter.sendMail);


module.exports = transporter;
