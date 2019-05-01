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
      userData: { id: userId }
    },
    res,
    next
  ) => {
    console.log("USER ID: " + userId);
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
  },
  /**
   * Responsible for retrieving all the cards that belong to a specific individual
   * The details of the card are passed through the payload
   * @return On Success JSON returns card id
   */
  retrieveUserCards: async ({ userData: { id: userId } }, res, next) => {
    let [queryError, queryResult] = await to(
      pool.promiseQuery("call get_user_cards(?)", [userId])
    );

    // Forward query error to central error handler.
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    //get the card id from the response
    const [resultSet] = queryResult;

    res.json({
      cards: resultSet
    });
  },

  /**
   * Responsible for deleting a card belonging to a user
   * The card_id to be deleted is passed in the payload
   * @return On Success JSON returns success/failed deletion
   */
  deleteUserCard: async (
    { body: { card_id }, userData: { id: userId } },
    res,
    next
  ) => {
    let [queryError, queryResult] = await to(
      pool.promiseQuery("call delete_user_card(?, ?)", [userId, card_id])
    );

    // Forward query error to central error handler.
    if (queryError) {
      return next(createHttpError(new SqlError(queryError)));
    }

    if (queryResult.affectedRows != 1) {
      res.status(404).json({
        message: "Card not found in order to delete it"
      });
    } else {
      res.json({
        message: "Card successfully deleted"
      });
    }
  }
};
