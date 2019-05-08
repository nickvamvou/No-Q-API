const express = require('express');
const router = express.Router();
const controller = require('./controller');


router.get(
  '/CCAGetRSA',
  controller.getRSAFile,
);

router.get(
  '/CCAResponseHandler',
  controller.getResponseHandlerFile,
);


module.exports = router;
