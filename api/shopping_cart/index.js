//deals with the shopping cart of the user
var express = require("express");
var router = express.Router();
const orderController = require("./shopping_cart");
const checkAuth = require("../middleware/check-auth");
const role = require("../user/user-role");
const { dbTransactionMiddleware } = require("../middleware");
router.get(
  "/:storeId/product/:barcode",
  orderController.getProductInformationBasedOnBarcode
);
//add product to user shopping cart
// TODO REMOVE COMMEN IN LINE 12
router.post(
  "/:userId/add",
  // checkAuth.userAuth([role.SHOPPER]),
  dbTransactionMiddleware.startDbTransaction,
  orderController.addProductToCart,
  dbTransactionMiddleware.endDbTransaction
);

// TODO REMOVE COMMEN IN LINE 20 (authorization)
//remove product from order
router.delete(
  "/:userId/remove",
  // checkAuth.userAuth([role.SHOPPER]),
  orderController.removeProductFromCartByBarcode
);

router.post(
  "/:userId/active_cart",
  // checkAuth.userAuth([role.SHOPPER]),
  orderController.getCartIDWithCartProductInformation
);

//add product to user shopping cart

router.post(
  "/:userId/addVoucher",
  checkAuth.userAuth([role.SHOPPER]),
  orderController.addVoucherToCart
);

//TODO checking of whether the user owns the cart
router.delete(
  "/:userId/deleteVoucher",
  checkAuth.userAuth([role.SHOPPER]),
  orderController.deleteVoucherFromCart
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
