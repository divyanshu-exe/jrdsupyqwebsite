const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require("multer");
const path = require("path");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:2017/campusarchive')
  .then(() => console.log('✅ Connected to MongoDB safely.'))
  .catch(err => console.error('❌ Database connection error:', err));

// Question Paper Schema & Model
const paperSchema = new mongoose.Schema({
    course: {
        type: String,
        required: true
    },
    semester: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    paperCode: {
        type: String,
        required: true
    },
    examType: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    session: {
        type: String,
        required: true
    },
    pdfUrl: {
        type: String,
        required: true
    }
}, { timestamps: true });

const Paper = mongoose.model('Paper', paperSchema);

// --- API ROUTES ---

// 1. GET: Fetch Papers with Live Search, Filter, and Pagination
app.get('/api/papers', async (req, res) => {
    try {
        const { search, course, semester, year, examType } = req.query;
        let query = {};

        // Live text search matching title or course code
       if (search) {
    query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { paperCode: { $regex: search, $options: "i" } }
    ];
}
        // Exact match filters
      if (course) query.course = course;
        if (semester) query.semester = semester;
        if (year) query.year = year;

        // Fetch filtered results sorted by newest first
        const papers = await Paper.find(query).sort({ createdAt: -1 });
        res.status(200).json(papers);
    } catch (error) {
        res.status(500).json({ message: "Server error fetching papers", error: error.message });
    }
});

app.get("/api/stats", async (req, res) => {

    try {

        const totalPapers = await Paper.countDocuments();

        const totalCourses = await Paper.distinct("course");

        res.json({

            totalPapers,

            totalCourses: totalCourses.length

        });

    }

    catch(err){

        res.status(500).json(err);

    }

});

const fs = require("fs");

app.delete("/api/papers/:id", async (req, res) => {

    try {

        const paper = await Paper.findById(req.params.id);

        if (!paper) {
            return res.status(404).json({
                message: "Paper not found"
            });
        }

        // Delete uploaded file
        const filePath = "." + paper.pdfUrl;

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete MongoDB record
        await Paper.findByIdAndDelete(req.params.id);

        res.json({
            message: "Paper Deleted Successfully"
        });

    }

    catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

// ==============================
// UPDATE AN EXISTING QUESTION PAPER
// ==============================
app.put("/api/papers/:id", async (req, res) => {

    try {

        // Update paper using MongoDB document ID
        const updatedPaper = await Paper.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true } // Return updated document
        );

        // Send updated paper back to frontend
        res.json(updatedPaper);

    } catch (err) {

        // Handle unexpected server error
        res.status(500).json({
            error: err.message
        });

    }

});

// 2. POST: Add a new paper (For admin panel use later)
app.post('/api/papers', upload.single('paperFile'), async (req, res) => {
    try {
        const {
    course,
    semester,
    subject,
    paperCode,
    examType,
    year,
    session
} = req.body;

const pdfUrl = req.file
    ? `/uploads/${req.file.filename}`
    : "";

const newPaper = new Paper({
    course,
    semester,
    subject,
    paperCode,
    examType,
    year,
    session,
    pdfUrl
});

const savedPaper = await newPaper.save();

res.status(201).json(savedPaper);
    } catch (error) {
        res.status(400).json({ message: "Error saving paper data", error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running smoothly on port ${PORT}`);
});

