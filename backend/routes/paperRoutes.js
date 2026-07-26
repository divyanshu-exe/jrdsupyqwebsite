const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload");

const verifyToken = require("../middleware/authMiddleware");

const {

    getAllPapers,

    getStats,

    uploadPaper,

    updatePaper,

    deletePaper,

} = require("../controllers/paperController");

// ==========================================
// GET ALL PAPERS
// ==========================================

router.get("/", getAllPapers);

// ==========================================
// DASHBOARD STATS
// ==========================================

router.get("/stats", getStats);

// ==========================================
// UPLOAD NEW PAPER
// ==========================================

router.post(
  "/upload",
  verifyToken,
  upload.single("paper"),
  uploadPaper
);

// ==========================================
// UPDATE PAPER
// ==========================================

router.put(
    "/:id",
    verifyToken,
    updatePaper
);

// ==========================================
// DELETE PAPER
// ==========================================

router.delete("/:id", verifyToken, deletePaper);

module.exports = router;