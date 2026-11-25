const Paper = require("../models/Paper");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

// Helper to escape regex special characters to prevent ReDoS / injection
const escapeRegex = (str) => {
    return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// Helper for streaming upload to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "CampusArchive",
                resource_type: "auto",
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};

// ==========================================
// GET ALL PAPERS
// ==========================================

const getAllPapers = async (req, res) => {
    try {
        const { search, course, semester, year } = req.query;

        let query = {};

        if (search && search.trim()) {
            const sanitizedSearch = escapeRegex(search.trim());

            query.$or = [
                {
                    subject: {
                        $regex: sanitizedSearch,
                        $options: "i",
                    },
                },
                {
                    paperCode: {
                        $regex: sanitizedSearch,
                        $options: "i",
                    },
                },
            ];
        }

        if (course) query.course = course;
        if (semester) query.semester = semester;
        if (year) query.year = year;

        const papers = await Paper.find(query)
            .select("-publicId -__v")
            .sort({ createdAt: -1 })
            .lean();

        res.json(papers);
    } catch (err) {
        res.status(500).json({
            error: err.message,
        });
    }
};

// ==========================================
// GET DASHBOARD STATS
// ==========================================

const getStats = async (req, res) => {
    try {
        const [totalPapers, totalCourses] = await Promise.all([
            Paper.countDocuments(),
            Paper.distinct("course"),
        ]);

        res.json({
            totalPapers,
            totalCourses: totalCourses.length,
        });
    } catch (err) {
        res.status(500).json({
            error: err.message,
        });
    }
};

// ==========================================
// UPLOAD PAPER
// ==========================================

const uploadPaper = async (req, res) => {
    try {
        const {
            course,
            semester,
            subject,
            paperCode,
            examType,
            year,
            session,
        } = req.body;

        if (!req.file) {
            return res.status(400).json({
                message: "Please upload a file.",
            });
        }

        const uploadedFile = await uploadToCloudinary(req.file.buffer);

        const paper = await Paper.create({
            course,
            semester,
            subject,
            paperCode,
            examType,
            year,
            session,
            pdfUrl: uploadedFile.secure_url,
            publicId: uploadedFile.public_id,
        });

        res.status(201).json(paper);
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({
            error: err.message,
        });
    }
};

// ==========================================
// UPDATE PAPER
// ==========================================

const updatePaper = async (req, res) => {
    try {
        let updateData = { ...req.body };

        // If a new file is uploaded during edit, replace on Cloudinary
        if (req.file) {
            const existingPaper = await Paper.findById(req.params.id);
            if (!existingPaper) {
                return res.status(404).json({ message: "Paper not found" });
            }

            // Upload new file
            const uploadedFile = await uploadToCloudinary(req.file.buffer);
            updateData.pdfUrl = uploadedFile.secure_url;
            updateData.publicId = uploadedFile.public_id;

            // Delete old file from Cloudinary
            if (existingPaper.publicId) {
                try {
                    await cloudinary.uploader.destroy(existingPaper.publicId, {
                        resource_type: "raw",
                    });
                    await cloudinary.uploader.destroy(existingPaper.publicId, {
                        resource_type: "image",
                    });
                } catch (cErr) {
                    console.warn("Could not delete old asset from Cloudinary:", cErr.message);
                }
            }
        }

        const paper = await Paper.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        res.json(paper);
    } catch (err) {
        res.status(500).json({
            error: err.message,
        });
    }
};

// ==========================================
// DELETE PAPER
// ==========================================

const deletePaper = async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);

        if (!paper) {
            return res.status(404).json({
                message: "Paper not found",
            });
        }

        // Delete from Cloudinary
        if (paper.publicId) {
            try {
                let result = await cloudinary.uploader.destroy(paper.publicId, {
                    resource_type: "image",
                });

                if (result.result !== "ok") {
                    await cloudinary.uploader.destroy(paper.publicId, {
                        resource_type: "raw",
                    });
                }
            } catch (cErr) {
                console.warn("Cloudinary delete error:", cErr.message);
            }
        }

        // Delete from MongoDB
        await Paper.findByIdAndDelete(req.params.id);

        res.json({
            message: "Paper deleted successfully.",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message,
        });
    }
};

module.exports = {
    getAllPapers,
    getStats,
    uploadPaper,
    updatePaper,
    deletePaper,
};
