const getAllProducts = (req, res, next) => {
  res.status(200).json({
    message: "Handling GET request to /products"
  });
};

const getProduct = (req, res, next) => {
  //extract product id
  const productId = req.params.productId;
  res.status(200).json({
    message: "Retrieve information about product " + req.params.productId
  });
};

const deleteProduct = (req, res, next) => {
  //extract product id
  const productId = req.params.productId;
  res.status(200).json({
    message: "Delete specific product " + req.params.productId
  });
};

const updateProduct = (req, res, next) => {
  //extract product id
  const productId = req.params.productId;
  res.status(200).json({
    message: "Update specific product " + req.params.productId
  });
};


module.exports = {
  getAllProducts,
  getProduct,
  deleteProduct,
  updateProduct,
};
