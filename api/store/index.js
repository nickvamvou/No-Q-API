const express = require("express");
const router = express.Router();

const checkAuth = require("api/middleware/check-auth");
const userRoles = require("api/constants/user_roles");
const upload = require("api/middleware/upload-product-photo"); // For multi form data - images
const controller = require("api/store/controller");


/*
 *******************************************************************
 *           Store Creation, Deletion and Modification
 *******************************************************************
 */

// Create new store. Needs the username to create the store (taken from req)
//  and store details
router.post(
  "/:userId/createNewStore",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  controller.createNewStore
);

// Delete store (Only an administrator can delete stores)
router.delete(
  "/:storeId/delete",
  checkAuth.userAuth([userRoles.ADMIN]),
  controller.removeStore
);

// Retrieves all stores
router.get("/", checkAuth.userAuth([userRoles.ADMIN]), controller.getAllStores);

// Retrieve all stores from specifc user
router.get(
  "/:userId/stores",
  checkAuth.userAuth([userRoles.ADMIN, userRoles.RETAILER]),
  controller.getStoresOfUser
);

// Get all completed orders for a given store
router.get(
  "/:storeId/orders",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  controller.getStoreOrders
);

// View all customers from specific shop.
router.get(
  "/:storeId/customers",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  controller.getStoreCustomers
);

// Add a new product to a store
router.post(
  "/:storeId/newProduct",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  upload.single("productImage"),
  controller.addNewProduct
);

// Retrieve all items from specific store
router.get(
  "/:storeId/items",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  controller.getProductsFromStore
);

// Deletes an item from store
router.delete(
  "/:storeId/:itemId/delete",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  // checkAuth.userAuth(userRoles.RETAILER),
  controller.removeItem
);

// Update a product in a store
router.patch(
  "/:storeId/:productId",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  controller.updateProduct
);

// Create new product details for a product
router.post(
  "/:storeId/productDetails",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  controller.addNewProductDetails
);

// Get all product details in a store
router.get(
  "/:storeId/productDetails",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  controller.getAllProductDetails
);

// Get details of a product in a store
router.get(
  "/:storeId/productDetails/:productDetailsId",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  controller.getProductDetails
);

// Create a new product entry based on the product details id
router.post(
  "/:storeId/:productDetailsId/newProduct",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  upload.single("productImage"),
  controller.addNewProductEntry
);

// Add a single door in shop (create door id and it will have a store id)
router.post(
  ":/storeId/createNewDoor",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  controller.addDoorToShop
);

// Log a door in so it can function
router.post(
  ":/storeId/doorLogin",
  checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  controller.doorLogin
);

//TODO uncomment line 116 (authorization)
router.post(
  "/:storeId/vouchers/addVoucher",
  // checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  controller.addVoucherToShop
);

//TODO uncomment line 116 (authorization)
router.delete(
  "/:storeId/vouchers/:voucherId/delete",
  // checkAuth.userAuth([userRoles.RETAILER, userRoles.ADMIN]),
  controller.deleteVoucherFromShop
);


module.exports = router;
