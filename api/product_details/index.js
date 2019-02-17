const express = require("express");
const router = express.Router();
const productDetailsController = require("./product_details");
const checkAuth = require("../middleware/check-auth");
const role = require("../user/user-role");


// Update product details information
router.patch(
  "/:productDetailsId",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  productDetailsController.updateProductDetails
);


module.exports = router;
