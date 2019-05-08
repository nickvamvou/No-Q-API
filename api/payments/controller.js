const path = require('path');


/**
 * This particular method spits out CCA's getRSA file
 *
 * @param req - express request object containing information about the request
 * @param res - express response object
 */
exports.getRSAFile = async (req, res) => {
  // Send static HTML file.
  res.sendFile(path.resolve('./api/payments/cca/getRSA.jsp'));
};

/**
 * This particular method spits out CCA's responseHandler file
 *
 * @param req - express request object containing information about the request
 * @param res - express response object
 */
exports.getResponseHandlerFile = async (req, res) => {
  // Send static HTML file.
  res.sendFile(path.resolve('./api/payments/cca/responseHandler.jsp'));
};
