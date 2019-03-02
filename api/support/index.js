const express = require('express');
const router = express.Router();

const controller = require('api/support/controller');
const userRoles = require('api/constants/user_roles');
const checkAuth = require('api/middleware/check-auth');


// Reports a bug to NoQ's support email or the otherwise specified email.
router.post(
  '/sendMessage',
  checkAuth.userAuth([userRoles.SHOPPER, userRoles.RETAILER]),
  controller.sendMessage
);


module.exports = router;
