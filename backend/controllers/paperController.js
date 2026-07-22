const Paper = require("../models/Paper");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

// ==========================================
// GET ALL PAPERS
// ==========================================

const getAllPapers = async (req, res) => {

    try {

        const { search, course, semester, year } = req.query;

        let query = {};

        if (search) {

            query.$or = [

                {
                    subject: {
                        $regex: search,
                        $options: "i"
                    }
                },

                {
                    paperCode: {
                        $regex: search,
                        $options: "i"
                    }
                }

            ];

        }

        if (course) query.course = course;

        if (semester) query.semester = semester;

        if (year) query.year = year;

        const papers = await Paper.find(query).sort({

            createdAt: -1

        });

        res.json(papers);

    }

    catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

};

// ==========================================
// GET DASHBOARD STATS
// ==========================================

const getStats = async (req, res) => {

    try {

        const totalPapers = await Paper.countDocuments();

        const totalCourses = await Paper.distinct("course");

        res.json({

            totalPapers,

            totalCourses: totalCourses.length

        });

    }

    catch (err) {

        res.status(500).json({

            error: err.message

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

        const uploadStream = () =>
            new Promise((resolve, reject) => {
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

                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });

        const uploadedFile = await uploadStream();

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
    }catch (err) {
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

      const paper = await Paper.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
        new: true,
        runValidators: true,
    }
);

        res.json(paper);

    }

    catch (err) {

        res.status(500).json({

            error: err.message

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
    await cloudinary.uploader.destroy(paper.publicId);
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