const express = require("express");
const router = express.Router();

const controller = require("api/product/controller");
const checkAuth = require("api/middleware/check-auth");
const userRoles = require("api/constants/user_roles");


// Get all the products.
router.get(
  "/",
  checkAuth.userAuth([userRoles.ADMIN]),
  controller.getAllProducts
);

// Get a specific product information with its id (RFID tag)
router.get(
  "/:productId",
  checkAuth.userAuth([userRoles.ADMIN]),
  controller.getProduct
);

// Delete a specific product
router.delete(
  "/:productId/delete",
  checkAuth.userAuth([userRoles.ADMIN]),
  controller.deleteProduct
);

// Update the information of a specific product
router.patch(
  "/:productId",
  checkAuth.userAuth([userRoles.ADMIN]),
  controller.deleteProduct
);


module.exports = router;
