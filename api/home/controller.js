/*
  Module fop API home controllers
 */


/**
 *
 * This endpoint handler renders API static home page
 */
exports.renderHomePage = (req, res) => {
  res.render('index', { title: 'Express' });
};
