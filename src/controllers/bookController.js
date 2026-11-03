const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const categories = [
  "Fiction",
  "Science",
  "History",
  "Kids",
  "Others",
];

const validateBookFields = (body, partial = false) => {
  const fields = {};

  const textFields = {
    title: 120,
    author: 100,
    description: 1200,
  };

  for (const [key, maxLength] of Object.entries(textFields)) {
    if (body[key] === undefined) {
      if (!partial) {
        return { error: `${key} is required.` };
      }

      continue;
    }

    if (typeof body[key] !== "string") {
      return { error: `Invalid ${key}.` };
    }

    const value = body[key].trim();

    if (!value || value.length > maxLength) {
      return { error: `Invalid ${key}.` };
    }

    fields[key] = value;
  }

  if (body.category !== undefined) {
    if (!categories.includes(body.category)) {
      return { error: "Invalid book category." };
    }

    fields.category = body.category;
  } else if (!partial) {
    return { error: "Category is required." };
  }

  if (body.image !== undefined) {
    if (typeof body.image !== "string") {
      return { error: "Invalid image URL." };
    }

    try {
      const imageURL = new URL(body.image);

      if (!["https:", "http:"].includes(imageURL.protocol)) {
        return { error: "Invalid image URL." };
      }

      fields.image = body.image;
    } catch {
      return { error: "Invalid image URL." };
    }
  } else if (!partial) {
    return { error: "Book image is required." };
  }

  if (body.totalCopies !== undefined) {
    const copies = Number(body.totalCopies);

    if (
      !Number.isInteger(copies) ||
      copies < 1 ||
      copies > 1000
    ) {
      return { error: "Total copies must be between 1 and 1000." };
    }

    fields.totalCopies = copies;
  } else if (!partial) {
    return { error: "Total copies are required." };
  }

  return { fields };
};

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

  const filter = {};

  if (req.query.mine === "true") {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    filter["addedBy.userId"] = req.user.id;
  }

  let query = database
    .collection("books")
    .find(filter)
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

const createBook = async (req, res) => {
  const { fields, error } = validateBookFields(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error,
    });
  }

  const database = getDB();

  const now = new Date();

  const newBook = {
    ...fields,

    availableCopies: fields.totalCopies,

    addedBy: {
      userId: req.user.id,
      name: req.user.name,
      email: req.user.email,
    },

    createdAt: now,
    updatedAt: now,
  };

  const result = await database.collection("books").insertOne(newBook);

  const savedBook = await database.collection("books").findOne({
    _id: result.insertedId,
  });

  res.status(201).json({
    success: true,
    message: "Book added successfully.",
    data: savedBook,
  });
};

const updateBook = async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid book ID.",
    });
  }

  const { fields, error } = validateBookFields(req.body, true);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error,
    });
  }

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid fields provided.",
    });
  }

  const database = getDB();
  const bookId = new ObjectId(id);

  const existingBook = await database.collection("books").findOne({
    _id: bookId,
    "addedBy.userId": req.user.id,
  });

  if (!existingBook) {
    return res.status(404).json({
      success: false,
      message: "Book not found or access denied.",
    });
  }

  if (fields.totalCopies !== undefined) {
    const activeBorrows = await database
      .collection("borrows")
      .countDocuments({
        bookId,
        status: "borrowed",
      });

    if (fields.totalCopies < activeBorrows) {
      return res.status(409).json({
        success: false,
        message: "Total copies cannot be less than active borrows.",
      });
    }

    fields.availableCopies = fields.totalCopies - activeBorrows;
  }

  fields.updatedAt = new Date();

  await database.collection("books").updateOne(
    {
      _id: bookId,
      "addedBy.userId": req.user.id,
    },
    {
      $set: fields,
    }
  );

  const updatedBook = await database.collection("books").findOne({
    _id: bookId,
  });

  res.status(200).json({
    success: true,
    message: "Book updated successfully.",
    data: updatedBook,
  });
};

const deleteBook = async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid book ID.",
    });
  }

  const database = getDB();
  const bookId = new ObjectId(id);

  const existingBook = await database.collection("books").findOne({
    _id: bookId,
    "addedBy.userId": req.user.id,
  });

  if (!existingBook) {
    return res.status(404).json({
      success: false,
      message: "Book not found or access denied.",
    });
  }

  const activeBorrows = await database
    .collection("borrows")
    .countDocuments({
      bookId,
      status: "borrowed",
    });

  if (activeBorrows > 0) {
    return res.status(409).json({
      success: false,
      message: "Cannot delete a book that is currently borrowed.",
    });
  }

  await database.collection("books").deleteOne({
    _id: bookId,
    "addedBy.userId": req.user.id,
  });

  res.status(200).json({
    success: true,
    message: "Book deleted successfully.",
  });
};


module.exports = {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  validateBookFields,
};