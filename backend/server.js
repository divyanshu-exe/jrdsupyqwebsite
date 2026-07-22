const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Routes
const paperRoutes = require("./routes/paperRoutes");

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

// ==========================================
// Root Route
// ==========================================

app.get("/", (req, res) => {

    res.send("🚀 CampusArchive Backend Running");

});

// ==========================================
// Start Server
// ==========================================

app.listen(PORT, () => {

    console.log(`🚀 Server running on Port ${PORT}`);

});