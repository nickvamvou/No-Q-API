const express = require('express');
const router = express.Router();

const controller = require('./controller');
const helpers = require('api/user/helpers');


// Initiate password reset process for any individual user. Works for a customer or an employee.
router.post(
  '/forgotPassword',
  controller.initiateIndividualPassReset,
  helpers.generatePassResetToken,
  helpers.sendPassResetMail,
);


module.exports = router;
