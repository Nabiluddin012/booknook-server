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

router.get(
  "/",
  (req, res, next) => {
    if (req.query.mine === "true") {
      return requireAuth(req, res, next);
    }

    next();
  },
  getAllBooks
);
router.get("/:id", getBookById);

router.post("/", requireAuth, createBook);

module.exports = router;

router.patch("/:id", requireAuth, updateBook);

router.delete("/:id", requireAuth, deleteBook);