const express = require("express");

const {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
} = require("../controllers/bookController");

const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.get("/", getAllBooks);
router.get("/:id", getBookById);

router.post("/", requireAuth, createBook);

module.exports = router;

router.patch("/:id", requireAuth, updateBook);

router.delete("/:id", requireAuth, deleteBook);