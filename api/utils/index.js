const mailer = require('./mailer');
const errors = require('./errors');
const readFile = require('./file_reader');


module.exports = {
  ...mailer,
  ...errors,
  readFile,
};
