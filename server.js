require("dotenv").config();

const app = require("./src/app");
const { connectDB } = require("./src/config/db");
const createIndexes = require("./src/config/indexes");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await createIndexes();

    app.listen(PORT, () => {
      console.log(`BookNook Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();