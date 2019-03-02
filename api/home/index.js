const express = require('express');
const router = express.Router();

const controller = require('api/home/controller');


// Render API home page
router.get(
  controller.renderHomePage,
);


module.exports = router;
