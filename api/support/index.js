const express = require('express');
const router = express.Router();
const controller = require('./controller');

const role = require('../user/user-role');
const checkAuth = require('../middleware/check-auth');


// Reports a bug to NoQ's support email or the otherwise specified email.
router.post(
  '/sendMessage',
  checkAuth.userAuth([role.SHOPPER, role.RETAILER]),
  controller.sendMessage
);


module.exports = router;
