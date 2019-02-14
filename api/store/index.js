const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const role = require("../user/user-role");
// For multi form data - images
const upload = require("../middleware/upload-product-photo");
const storeController = require("./store");

/*
 *******************************************************************
 *           Store Creation, Deletion and Modification
 *******************************************************************
 */

// Create new store. Needs the username to create the store (taken from req)
//  and store details
router.post(
  "/:userId/createNewStore",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.createNewStore
);

// Delete store (Only an administrator can delete stores)
router.delete(
  "/:storeId/delete",
  checkAuth.userAuth([role.ADMIN]),
  storeController.removeStore
);

// Retrieves all stores
router.get("/", checkAuth.userAuth([role.ADMIN]), storeController.getAllStores);

// Retrieve all stores from specifc user
router.get(
  "/:userId/stores",
  checkAuth.userAuth([role.ADMIN, role.RETAILER]),
  storeController.getStoresOfUser
);

// Get all completed orders for a given store
router.get(
  "/:storeId/orders",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.getStoreOrders
);

// View all customers from specific shop.
router.get(
  "/:storeId/customers",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.getStoreCustomers
);

// Add a new product to a store
router.post(
  "/:storeId/newProduct",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  upload.single("productImage"),
  storeController.addNewProduct
);

// Retrieve all items from specific store
router.get(
  "/:storeId/items",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.getProductsFromStore
);

// Deletes an item from store
router.delete(
  "/:storeId/:itemId/delete",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  // checkAuth.userAuth(role.RETAILER),
  storeController.removeItem
);

// Update a product in a store
router.patch(
  "/:storeId/:productId",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.updateProduct
);

// Create a new product (by creating its product details)
router.post(
  "/:storeId/productDetails",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.addNewProductDetails
);

// Get all product details in a store
router.get(
  "/:storeId/productDetails",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.getAllProductDetails
);

// Get details of a product in a store
router.get(
  "/:storeId/productDetails/:productDetailsId",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.getProductDetails
);

// Create a new product entry based on the product details id
router.post(
  "/:storeId/:productDetailsId/newProduct",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  upload.single("productImage"),
  storeController.addNewProductEntry
);

// Add a single door in shop (create door id and it will have a store id)
router.post(
  ":/storeId/createNewDoor",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.addDoorToShop
);

// Log a door in so it can function
router.post(
  ":/storeId/doorLogin",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.doorLogin
);

//TODO uncomment line 116 (authorization)
router.post(
  "/:storeId/vouchers/addVoucher",
  // checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.addVoucherToShop
);

//TODO uncomment line 116 (authorization)
router.delete(
  "/:storeId/vouchers/:voucherId/delete",
  // checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.deleteVoucherFromShop
);


module.exports = router;
