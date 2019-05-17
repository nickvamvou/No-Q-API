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

router.post(
  `/${process.env.CCA_ORDER_STATUS_EVENT_URL_SHA}`,
  controller.payForOrder,
);


module.exports = router;
