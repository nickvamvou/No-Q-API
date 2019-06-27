const bcrypt = require("bcrypt-nodejs");
const to = require("await-to-js").default;

exports.checkPassCorrectness = async (plainTextPass, hashedPass) => {
  const [error, isCorrect] = await to(
    bcrypt.compare(plainTextPass, hashedPass)
  );

  if (error) {
    throw error;
  }

  return isCorrect;
};

exports.hashPassword = async (planTextPass, saltRounds = 10) => {
  const [error, hash] = await to(bcrypt.hash(planTextPass, saltRounds));

  if (error) {
    throw error;
  }

  return hash;
};
