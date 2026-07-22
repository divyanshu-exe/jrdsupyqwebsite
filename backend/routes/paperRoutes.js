const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload");

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

    "/",

    upload.single("paperFile"),

    uploadPaper

);

// ==========================================
// UPDATE PAPER
// ==========================================

router.put(

    "/:id",

    updatePaper

);

// ==========================================
// DELETE PAPER
// ==========================================

router.delete(

    "/:id",

    deletePaper

);

module.exports = router;