const express = require('express');
const router = express.Router();

const controller = require('./controller');


// Log in an admin
router.post(
  '/login',
  controller.login,
);


module.exports = router;
