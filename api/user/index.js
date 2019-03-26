const express = require("express");
const router = express.Router();
const role = require("./user-role");
const userController = require("./user");
const checkAuth = require("../middleware/check-auth");
const retailerPath = require("../../config/private_routes");
const { dbTransactionMiddleware } = require("../middleware");

// Sign up a Shopper
router.post(
  "/signup/shopper",
  userController.checkUserExistence,
  userController.createHashedPass,
  userController.createShopper,
  userController.createRefreshToken,
  userController.createAccessToken,
  userController.sendAuthResponse
);

// Sign up an Retailer
router.post(
  retailerPath,
  userController.checkUserExistence,
  userController.createHashedPass,
  userController.createRetailer,
  userController.createRefreshToken,
  userController.createAccessToken,
  userController.sendAuthResponse
);

// Log in a Shopper (req.body.role will have the role of the shopper)
router.post(
  "/login/shopper",
  userController.getShopperPassIfExists,
  userController.checkPassCorrectness,
  userController.createRefreshToken,
  userController.createAccessToken,
  userController.sendAuthResponse
);

// Log in a Retailer (req.body.role will have the role of the retailer)
router.post(
  "/login/retailer",
  userController.getRetailerPassIfExists,
  userController.checkPassCorrectness,
  userController.createRefreshToken,
  userController.createAccessToken,
  userController.sendAuthResponse
);

// Log in an Admin (req.body.role will have the role of the admin)
router.post(
  "/login/admin",
  userController.getAdminPassIfExists,
  userController.checkPassCorrectness,
  userController.createRefreshToken,
  userController.createAccessToken,
  userController.sendAuthResponse
);

// Log in a customer with google. Alternatively registers a new customer and logs them in.
router.post("/googleLogin/customer", userController.loginCustomerWithGoogle);

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

/**
 * Initiate password reset process for a customer
 */
router.post(
  "/forgot-password/customer",
  userController.initiateIndividualPassReset
);

/**
 * Initiate password reset process for a retailer
 */
router.post(
  "/forgot-password/retailer",
  userController.initiateRetailerPassReset
);

/**
 * Resets user password
 */
router.post("/reset-password", userController.resetPassword);

/**
 * Renders html template with form to reset password
 */
router.get("/reset-password", userController.renderPassResetForm);

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
  "/:userId/purchases",
  checkAuth.userAuth([role.SHOPPER, role.ADMIN]),
  userController.getPreviousPurchases
);

router.get(
  "/me/purchases/:purchaseId",
  checkAuth.userAuth([role.SHOPPER, role.ADMIN]),
  userController.getPreviousPurchase
);

router.get(
  "/:userId/addVoucher",
  // checkAuth.userAuth([role.SHOPPER, role.ADMIN]),
  userController.addVoucherToUser
);

module.exports = router;
