const express = require('express');
const router = express.Router();

const controller = require('./controller');


router.post(
  `/${process.env.CCA_ORDER_STATUS_EVENT_URL_SHA}`,
  controller.createPurchaseCreatorJob,
);

router.post(
  `/${process.env.CCA_ORDER_REFUND_STATUS_EVENT_URL_SHA}`,
  controller.createRefundCreatorJob,
);


module.exports = router;
