const express = require("express");
const router = express.Router();

const userRoles = require("api/constants/user_roles");
const checkAuth = require("api/middleware/check-auth");
const controller = require("api/user/controller");


/**
 * Change user password.
 * User must be logged in.
 * Old password should be provided.
 */
router.patch(
  "/:userId/change-password",
  checkAuth.userAuth([userRoles.SHOPPER, userRoles.RETAILER, userRoles.RETAILER]),
  controller.changePassword
);

/**
 * Resets user password
 */
router.post(
    "/reset-password",
    controller.resetPassword,
);

/**
 * Renders html template with form to reset password
 */
router.get(
  "/reset-password",
  controller.renderPassResetForm,
);

// Change user passwrod by an Administrator.
router.patch(
  "/:userId/change-password/admin",
  checkAuth.userAuth([userRoles.SHOPPER, userRoles.ADMIN]),
  controller.changePasswordAdmin
);

// Delete a user only available for Shopper and Adminstrator
router.delete(
  "/:userId/delete",
  checkAuth.userAuth([userRoles.SHOPPER, userRoles.ADMIN]),
  controller.deleteUser
);

// //get a specific order from a user
// router.get(
//   "/:userId/:orderId",
//   checkAuth.userAuth([userRoles.ADMIN, userRoles.SHOPPER]),
//   orderController.getCompletedOrder
// );
//
// //returns all the completed orders of particular user
// router.get(
//   "/:userId/orders",
//   checkAuth.userAuth([userRoles.SHOPPER, userRoles.ADMIN]),
//   orderController.getUserCompletedOrders
// );

// Add coupon to user
router.post("/:userId/addVoucher", controller.addVoucher);

//update users details
router.patch(
  "/:userId/editDetails",
  // checkAuth.userAuth([userRoles.SHOPPER, userRoles.ADMIN]),
  controller.updateUserDetails
);

//returns the details of the user (firstname, lastname, dob)
router.get(
  "/:userId/details",
  // checkAuth.userAuth([userRoles.SHOPPER, userRoles.ADMIN]),
  controller.getUserDetails
);

router.get(
  "/:userId/getVouchers",
  // checkAuth.userAuth([userRoles.SHOPPER, userRoles.ADMIN]),
  controller.getUserVouchers
);

router.get(
  "/:userId/addVoucher",
  // checkAuth.userAuth([userRoles.SHOPPER, userRoles.ADMIN]),
  controller.addVoucherToUser
);


module.exports = router;
