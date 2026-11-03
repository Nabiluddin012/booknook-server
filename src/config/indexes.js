const { getDB } = require("./db");

const createIndexes = async () => {
  const database = getDB();

  await Promise.all([
    database.collection("books").createIndex({
      createdAt: -1,
    }),

    database.collection("books").createIndex({
      "addedBy.userId": 1,
    }),

    database.collection("borrows").createIndex({
      userId: 1,
      borrowDate: -1,
    }),

    database.collection("borrows").createIndex(
      {
        bookId: 1,
        userId: 1,
      },
      {
        unique: true,
        partialFilterExpression: {
          status: "borrowed",
        },
        name: "unique_active_borrow",
      }
    ),
  ]);

  console.log("Database indexes created successfully.");
};

module.exports = createIndexes;