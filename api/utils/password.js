const bcrypt = require("bcrypt-nodejs");
const to = require("await-to-js").default;

exports.checkPassCorrectness = async (plainTextPass, hashedPass) => {
  bcrypt.compare(plainTextPass, hashedPass, (error, isCorrect) => {
    if (error) {
      throw error;
    }

    return isCorrect;
  });
};

exports.hashPassword = async (planTextPass, saltRounds = 10) => {
  bcrypt.hash(planTextPass, saltRounds, (error, hash) => {
    if (error) {
      throw error;
    }

    return hash;
  });
};
