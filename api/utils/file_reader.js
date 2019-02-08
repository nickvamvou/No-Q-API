const fs = require('fs');


const readFile = (filePath, options = {}) => new Promise((resolve, reject) => {
  fs.readFile(filePath, {encoding: 'utf-8', ...options}, function (err, file) {
    if (err) {
      return reject(err);
    }

    resolve(file);
  });
});


module.exports = readFile;
