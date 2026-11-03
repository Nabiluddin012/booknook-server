const express = require("express");

const {
  getAllBooks,
  getBookById,
  createBook,
} = require("../controllers/bookController");

const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.get("/", getAllBooks);
router.get("/:id", getBookById);

router.post("/", requireAuth, createBook);

module.exports = router;