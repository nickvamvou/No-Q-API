module.exports = {
  getAllProducts: (req, res, next) => {
    res.status(200).json({
      message: "Handling GET request to /products"
    });
  },

  getProduct: (req, res, next) => {
    //extract product id
    const productId = req.params.productId;
    res.status(200).json({
      message: "Retrieve information about product " + req.params.productId
    });
  },

  deleteProduct: (req, res, next) => {
    //extract product id
    const productId = req.params.productId;
    res.status(200).json({
      message: "Delete specific product " + req.params.productId
    });
  },

  updateProduct: (req, res, next) => {
    (req, res, next) => {
      //extract product id
      const productId = req.params.productId;
      res.status(200).json({
        message: "Update specific product " + req.params.productId
      });
    };
  }
};
