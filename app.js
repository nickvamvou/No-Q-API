var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var bodyParser = require("body-parser");
var cors = require("cors");

var indexRouter = require("./routes/index");
var productsRouter = require("./api/product/index");
const productDetailsRouter = require("./api/product_details/index");
var storeRouter = require("./api/store/index");
var usersRouter = require("./api/user/index");
var cartRouter = require("./api/shopping_cart/index");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
// //adding headers to every response. From where we can receive requests
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   //allow all headers
//   res.header("Access-Control-Allow-Headers", "*");
//   //this is the first request that the broswer sends to check if it can make a request
//   if (req.method === "OPTIONS") {
//     res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
//     return res.status(200).json({});
//   }
// });

/*
*******************************************************************************
                                Routes
*******************************************************************************
*/
app.use("/", indexRouter);
app.use("/user", usersRouter);
app.use("/products", productsRouter);
app.use("/productDetails", productDetailsRouter);
app.use("/shopping_cart", cartRouter);
app.use("/store", storeRouter);
/*
*******************************************************************************
                                End
*******************************************************************************
*/

//error request because it did not go to any url above
app.use((req, res, next) => {
  const error = new Error("API endpoint not found");
  error.status = 404;
  next(error);
});

//handles errors thrown from every application
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.json({
    error: {
      message: err.message
    }
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
