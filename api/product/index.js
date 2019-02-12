const express = require("express");
const router = express.Router();
const productController = require("./product");
const checkAuth = require("../middleware/check-auth");
const role = require("../user/user-role");


// Get all the products.
router.get(
  "/",
  checkAuth.userAuth([role.ADMIN]),
  productController.getAllProducts
);

// Get a specific product information with its id (RFID tag)
router.get(
  "/:productId",
  checkAuth.userAuth([role.ADMIN]),
  productController.getProduct
);

// Delete a specific product
router.delete(
  "/:productId/delete",
  checkAuth.userAuth([role.ADMIN]),
  productController.deleteProduct
);

// Update the information of a specific product
router.patch(
  "/:productId",
  checkAuth.userAuth([role.ADMIN]),
  productController.deleteProduct
);


module.exports = router;
