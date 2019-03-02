const express = require('express');
const router = express.Router();

const { retailerSignUpRoute } = require("api/config/private_routes");
const controller = require('./controller');
const helpers = require('api/user/helpers');


// Log in a retailer
router.post("/login", controller.login);

// Create a new retailer
router.post(retailerSignUpRoute, controller.signUp);

// Initiate password reset process for a retailer.
router.post(
  '/forgotPassword',
  controller.initiatePassReset,
  helpers.generatePassResetToken,
  helpers.sendPassResetMail,
);


module.exports = router;
