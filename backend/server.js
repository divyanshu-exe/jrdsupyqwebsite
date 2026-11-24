const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Routes
const paperRoutes = require("./routes/paperRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

// ==========================================
// Middlewares
// ==========================================

app.use(cors());

app.use(express.json());



// Serve Uploaded Files
app.use("/uploads", express.static("uploads"));

// ==========================================
// MongoDB Connection
// ==========================================

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {

        console.log("✅ Connected to MongoDB successfully.");

    })
    .catch((err) => {

        console.error("❌ MongoDB Connection Error");

        console.error(err);

    });

// ==========================================
// API Routes
// ==========================================

app.use("/api/papers", paperRoutes);

app.use("/api/auth", authRoutes);

// ==========================================
// Root Route
// ==========================================

app.get("/", (req, res) => {

    res.send("🚀 CampusArchive Backend Running");

});

// ==========================================
// Global Error Handler (Multer & General Errors)
// ==========================================

app.use((err, req, res, next) => {
    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
            error: "File size exceeds the 15MB limit. Please upload a smaller file.",
        });
    }

    if (err.message && err.message.includes("Only PDF and Image files")) {
        return res.status(400).json({
            error: err.message,
        });
    }

    console.error("Unhandled Error:", err);
    res.status(err.status || 500).json({
        error: err.message || "Internal Server Error",
    });
});

// ==========================================
// Start Server
// ==========================================

app.listen(PORT, () => {

    console.log(`🚀 Server running on Port ${PORT}`);

});