const to = require("await-to-js").default;
const createHttpError = require("http-errors");
const fs = require("fs");
const util = require("util");
const pool = require("../../config/db_connection");
const role = require("../user/user-role");
const utils = require("../utils");
const moment = require("moment");
const { SqlError, databaseUtil } = require("../utils");

module.exports = {
  /**
   * Responsible for adding a credit/debit card to a user
   * The details of the card are passed through the payload
   * @return On Success JSON returns card id
   */
  addCardToUser: async (
    {
      body: { holder_name, expiry_date, last_four_digits, token },
      userData: { userId }
    },
    res,
    next
  ) => {
    let [queryError, queryResult] = await to(
      pool.promiseQuery("call add_card_to_user(?, ?, ?, ?, ?)", [
        userId,
        holder_name,
        expiry_date,
        last_four_digits,
        token
      ])
    );

    // Forward query error to central error handler.
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    //get the card id from the response
    const [card_id] = queryResult;

    res.json({
      message: "Your card has been added",
      card_id: card_id
    });
  }
};
