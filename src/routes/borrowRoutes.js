const express = require("express");

const requireAuth = require("../middleware/requireAuth");

const {
  createBorrow,
} = require("../controllers/borrowController");

const router = express.Router();

router.post("/", requireAuth, createBorrow);

module.exports = router;