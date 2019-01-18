const multer = require("multer");
const mkdirp = require("mkdirp");
//how to store the file
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    //destination folder of the photo
    const dir = "./product_photos/stores/" + req.params.storeId;
    //checking if the folder exists and if not it gets created
    mkdirp(dir, err => cb(err, dir));
    // cb(null, "./photos/" + req.params.storeId);
  },
  filename: function(req, file, cb) {
    //filename of the photo
    cb(null, req.body.rfid + ".jpeg");
  }
});
//filtering image file based on type
const fileFilter = (req, file, cb) => {
  //accept files that are in jpeg or png
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg") {
    cb(null, true);
  }
  //reject all other files
  else {
    cb(null, false);
  }
};
//upload stores a limit of the fileSize to be uploaded
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10 //10 mb max
  },
  fileFilter: fileFilter
});

module.exports = upload;
