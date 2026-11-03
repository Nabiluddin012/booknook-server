const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const createBorrow = async (req, res) => {
  const { bookId } = req.body;

  if (!bookId || !ObjectId.isValid(bookId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid book ID.",
    });
  }

  const database = getDB();
  const books = database.collection("books");
  const borrows = database.collection("borrows");

  const id = new ObjectId(bookId);

  const book = await books.findOneAndUpdate(
    {
      _id: id,
      availableCopies: { $gt: 0 },
    },
    {
      $inc: { availableCopies: -1 },
      $set: { updatedAt: new Date() },
    },
    {
      returnDocument: "after",
    }
  );

  if (!book) {
    const existingBook = await books.findOne({ _id: id });

    if (!existingBook) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.status(409).json({
      success: false,
      message: "This book is currently unavailable.",
    });
  }

  const borrowDate = new Date();
  const returnDate = new Date(borrowDate);

  returnDate.setDate(returnDate.getDate() + 7);

  const borrowData = {
    bookId: id,
    bookTitle: book.title,
    bookImage: book.image,
    userId: req.user.id,
    userName: req.user.name,
    userEmail: req.user.email,
    borrowDate,
    returnDate,
    status: "borrowed",
  };

  try {
    const result = await borrows.insertOne(borrowData);

    res.status(201).json({
      success: true,
      message: "Book borrowed successfully.",
      data: {
        _id: result.insertedId,
        ...borrowData,
      },
    });
  } catch (error) {
    await books.updateOne(
      { _id: id },
      { $inc: { availableCopies: 1 } }
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already borrowed this book.",
      });
    }

    throw error;
  }
};

const getMyBorrows = async (req, res) => {
  const database = getDB();

  const borrows = await database
    .collection("borrows")
    .find({
      userId: req.user.id,
      status: "borrowed",
    })
    .sort({ borrowDate: -1 })
    .toArray();

  res.status(200).json({
    success: true,
    count: borrows.length,
    data: borrows,
  });
};

const returnBook = async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid borrow ID.",
    });
  }

  const database = getDB();

  const borrows = database.collection("borrows");
  const books = database.collection("books");

  const borrow = await borrows.findOneAndUpdate(
    {
      _id: new ObjectId(id),
      userId: req.user.id,
      status: "borrowed",
    },
    {
      $set: {
        status: "returning",
        returnProcessedAt: new Date(),
      },
    },
    {
      returnDocument: "after",
    }
  );

  if (!borrow) {
    return res.status(404).json({
      success: false,
      message: "Active borrow record not found.",
    });
  }

  try {
    const result = await books.updateOne(
      {
        _id: borrow.bookId,
        $expr: {
          $lt: ["$availableCopies", "$totalCopies"],
        },
      },
      {
        $inc: { availableCopies: 1 },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.modifiedCount !== 1) {
      await borrows.updateOne(
        {
          _id: borrow._id,
          status: "returning",
        },
        {
          $set: { status: "borrowed" },
          $unset: { returnProcessedAt: "" },
        }
      );

      return res.status(409).json({
        success: false,
        message: "Unable to update book availability.",
      });
    }

    await borrows.deleteOne({
      _id: borrow._id,
      userId: req.user.id,
      status: "returning",
    });

    res.status(200).json({
      success: true,
      message: "Book returned successfully.",
    });
  } catch (error) {
    await borrows.updateOne(
      {
        _id: borrow._id,
        status: "returning",
      },
      {
        $set: { status: "borrowed" },
        $unset: { returnProcessedAt: "" },
      }
    );

    throw error;
  }
};

module.exports = {
  createBorrow,
  getMyBorrows,
  returnBook,
};