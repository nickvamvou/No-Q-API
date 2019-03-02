const express = require("express");
const router = express.Router();

const controller = require("api/product_details/controller");
const checkAuth = require("api/middleware/check-auth");
const userRoles = require("api/constants/user_roles");


// Update product details information
router.patch(
  "/:productDetailsId",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  controller.updateProductDetails
);


module.exports = router;
