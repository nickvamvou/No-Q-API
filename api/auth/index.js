const express = require("express");
const router = express.Router();

const controller = require("./controller");


// Sign up a Shopper
router.post("/token", controller.getAccessToken);


module.exports = router;
