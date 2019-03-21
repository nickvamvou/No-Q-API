const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const { dbTransactionMiddleware } = require("../middleware");
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

router.get(
  "/getAllStores",
  checkAuth.userAuth([role.SHOPPER, role.ADMIN]),
  storeController.getStores
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

// Get details about an order
router.get(
  "/:storeId/orders/:orderId",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.getStoreOrder
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

// Create a new item group
router.post(
  "/:storeId/itemGroups",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  dbTransactionMiddleware.startDbTransaction,
  storeController.createOrUpdateGroupedOptions,
  storeController.createOrUpdateItemGroup,
  dbTransactionMiddleware.endDbTransaction
);

// Get all item groups.
router.get(
  "/:storeId/itemGroups",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.getItemGroups
);

// Update an item group
router.patch(
  "/:storeId/itemGroups/:itemGroupId",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  dbTransactionMiddleware.startDbTransaction,
  storeController.createOrUpdateGroupedOptions,
  storeController.createOrUpdateItemGroup,
  dbTransactionMiddleware.endDbTransaction
);

// Delete an item group
router.delete(
  "/:storeId/itemGroups/:itemGroupId",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.softDeleteItemGroup
);

// Get all product details associated with an item group
router.get(
  "/:storeId/itemGroups/:itemGroupId/products",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.getProductDetailsByItemGroup
);

// Update a product in a store
router.patch(
  "/:storeId/:productId",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.updateProduct
);

// Create new product details for a product
router.post(
  "/:storeId/itemGroups/:itemGroupId/productDetails",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  dbTransactionMiddleware.startDbTransaction,
  storeController.createOrUpdateGroupedOptions,
  storeController.createProductDetails,
  dbTransactionMiddleware.endDbTransaction
);

// Get all scanned unpaid products
router.get(
  "/:storeId/scannedUnpaidProducts",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.getScannedUnpaidProducts
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

// Flag details of a product as deleted
router.delete(
  "/:storeId/productDetails/:productDetailsId",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.softDelProductDetails
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

router.get(
  "/:storeId/vouchers",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.getVouchersFromShop
);

//TODO uncomment line 116 (authorization)
router.post(
  "/:storeId/vouchers/addVoucher",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  dbTransactionMiddleware.startDbTransaction,
  storeController.addVoucherToShop,
  dbTransactionMiddleware.endDbTransaction
);

//TODO uncomment line 116 (authorization)
router.delete(
  "/:storeId/vouchers/:voucherId/delete",
  checkAuth.userAuth([role.RETAILER, role.ADMIN]),
  storeController.deleteVoucherFromShop
);

module.exports = router;
