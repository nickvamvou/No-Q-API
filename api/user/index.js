var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
//for token exchange between client and server
const jwt = require("jsonwebtoken");
//this is the key used to sign the jwt
const key = require("../../config/jwt_s_key");
const role = require("./user-role");
const userController = require("./user");
const checkAuth = require("../middleware/check-auth");
const retailerPath = require("../../config/private_routes");
const pool = "../../config/db_connection";

// Sign up a Shopper
router.post("/signup/shopper", userController.signupShopper);

// Sign up an Retailer
router.post(retailerPath, userController.signupRetailer);

// Log in a Shopper (req.body.role will have the role of the shopper)
router.post("/login/shopper", userController.loginShopper);

// Log in a Retailer (req.body.role will have the role of the retailer)
router.post("/login/retailer", userController.loginRetailer);

// Log in an Admin (req.body.role will have the role of the admin)
router.post("/login/admin", userController.loginAdmin);

/**
 * Change user password.
 * User must be logged in.
 * Old password should be provided.
 */
router.patch(
  "/:userId/change-password",
  checkAuth.userAuth([role.SHOPPER, role.RETAILER, role.RETAILER]),
  userController.changePassword
);

// Change user passwrod by an Administrator.
router.patch(
  "/:userId/change-password/admin",
  checkAuth.userAuth([role.SHOPPER, role.ADMIN]),
  userController.changePasswordAdmin
);

// Delete a user only available for Shopper and Adminstrator
router.delete(
  "/:userId/delete",
  checkAuth.userAuth([role.SHOPPER, role.ADMIN]),
  userController.deleteUser
);

// //get a specific order from a user
// router.get(
//   "/:userId/:orderId",
//   checkAuth.userAuth([role.ADMIN, role.SHOPPER]),
//   orderController.getCompletedOrder
// );
//
// //returns all the completed orders of particular user
// router.get(
//   "/:userId/orders",
//   checkAuth.userAuth([role.SHOPPER, role.ADMIN]),
//   orderController.getUserCompletedOrders
// );

// Add coupon to user
router.post("/:userId/addVoucher", userController.addVoucher);

//update users details
router.patch(
  "/:userId/editDetails",
  // checkAuth.userAuth([role.SHOPPER, role.ADMIN]),
  userController.updateUserDetails
);

//returns the details of the user (firstname, lastname, dob)
router.get(
  "/:userId/details",
  // checkAuth.userAuth([role.SHOPPER, role.ADMIN]),
  userController.getUserDetails
);

router.get(
  "/:userId/getVouchers",
  // checkAuth.userAuth([role.SHOPPER, role.ADMIN]),
  userController.getUserVouchers
);

router.get(
  "/:userId/addVoucher",
  // checkAuth.userAuth([role.SHOPPER, role.ADMIN]),
  userController.addVoucherToUser
);

module.exports = router;
