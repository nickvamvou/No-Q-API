//deals with the shopping cart of the user
var express = require("express");
var router = express.Router();
const orderController = require("./shopping_cart");
const checkAuth = require("../middleware/check-auth");
const role = require("../user/user-role");

//add product to user shopping cart
// TODO REMOVE COMMEN IN LINE 12
router.get(
  "/:userId/:itemId/add",
  // checkAuth.userAuth([role.SHOPPER]),
  orderController.addProductToCart
);

// TODO REMOVE COMMEN IN LINE 20 (authorization)
//remove product from order
router.delete(
  "/:userId/:itemId/remove",
  // checkAuth.userAuth([role.SHOPPER]),
  orderController.removeProductFromCart
);

//Needs modification
//this endpoint is called from doors and must be kept private
//userId is the door id
router.post(
  "/:userId/pay",
  checkAuth.userAuth([role.SHOPPER]),
  orderController.payForOrder
);

module.exports = router;
