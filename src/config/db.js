const tls = require("tls");

const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

let client;
let database;

const connectDB = async () => {
  if (!uri) {
    throw new Error("MongoDB connection string is missing.");
  }

  if (!dbName) {
    throw new Error("Database name is missing.");
  }

  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    tls: true,
  });

  await client.connect();

  database = client.db(dbName);

  await database.command({ ping: 1 });

  console.log(`MongoDB Connected: ${dbName}`);

  return database;
};

const getDB = () => {
  if (!database) {
    throw new Error("Database is not connected.");
  }

  return database;
};

module.exports = {
  connectDB,
  getDB,
};