const express = require('express');
const router = express.Router();

const controller = require('./controller');


// Create a new customer
router.post(
  '/signup',
  controller.signUp,
);

// Logs in a customer
router.post(
  '/login',
  controller.login
);

// Log in or create new user via google auth
router.post(
  '/googleLogin',
  controller.loginWithGoogle
);


module.exports = router;
