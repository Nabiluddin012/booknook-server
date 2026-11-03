const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const getAllBooks = async (req, res) => {
  const database = getDB();

  const rawLimit = req.query.limit;
  const limit = rawLimit ? Number(rawLimit) : 0;

  if (
    rawLimit &&
    (!Number.isInteger(limit) || limit < 1 || limit > 100)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid limit value.",
    });
  }

  let query = database
    .collection("books")
    .find({})
    .sort({ createdAt: -1, _id: -1 });

  if (limit) {
    query = query.limit(limit);
  }

  const books = await query.toArray();

  res.status(200).json({
    success: true,
    count: books.length,
    data: books,
  });
};

const getBookById = async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid book ID.",
    });
  }

  const database = getDB();

  const book = await database.collection("books").findOne({
    _id: new ObjectId(id),
  });

  if (!book) {
    return res.status(404).json({
      success: false,
      message: "Book not found.",
    });
  }

  res.status(200).json({
    success: true,
    data: book,
  });
};

module.exports = {
  getAllBooks,
  getBookById,
};