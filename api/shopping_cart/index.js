//deals with the shopping cart of the user
const express = require("express");
const router = express.Router();

const checkAuth = require("api/middleware/check-auth");
const userRoles = require("api/constants/user_roles");
const controller = require("api/shopping_cart/controller");


//add product to user shopping cart
// TODO REMOVE COMMEN IN LINE 12
router.post(
  "/:userId/add",
  // checkAuth.userAuth([userRoles.SHOPPER]),
  controller.addProductToCart
);

// TODO REMOVE COMMEN IN LINE 20 (authorization)
//remove product from order
router.delete(
  "/:userId/remove",
  // checkAuth.userAuth([userRoles.SHOPPER]),
  controller.removeProductFromCart
);

router.post(
  "/:userId/active_cart",
  // checkAuth.userAuth([userRoles.SHOPPER]),
  controller.getCartIDWithCartProductInformation
);

//add product to user shopping cart

router.post("/:userId/addVoucher", controller.addVoucherToCart);

//Needs modification
//this endpoint is called from doors and must be kept private
//userId is the door id
router.post(
  "/:userId/pay",
  checkAuth.userAuth([userRoles.SHOPPER]),
  controller.payForOrder
);


module.exports = router;
