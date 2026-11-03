const express = require("express");

const requireAuth = require("../middleware/requireAuth");

const {
  createBorrow,
  getMyBorrows,
  returnBook,
} = require("../controllers/borrowController");

const router = express.Router();

router.post("/", requireAuth, createBorrow);

router.get("/", requireAuth, getMyBorrows);

router.delete("/:id", requireAuth, returnBook);

module.exports = router;