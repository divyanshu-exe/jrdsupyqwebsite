const mongoose = require("mongoose");

// ==========================================
// Question Paper Schema
// ==========================================

const paperSchema = new mongoose.Schema(
    {
        course: {
            type: String,
            required: true,
        },

        semester: {
            type: String,
            required: true,
        },

        subject: {
            type: String,
            required: true,
        },

        paperCode: {
            type: String,
            required: true,
        },

        examType: {
            type: String,
            required: true,
        },

        year: {
            type: String,
            required: true,
        },

        session: {
            type: String,
            required: true,
        },

        // Cloudinary / File URL
        pdfUrl: {
            type: String,
            required: true,
        },
        publicId: {
    type: String,
    required: true,
},
    },
    {
        timestamps: true,
    }
);

// Indexes for fast filtering and sorting
paperSchema.index({ createdAt: -1 });
paperSchema.index({ course: 1, semester: 1, year: 1, createdAt: -1 });
paperSchema.index({ subject: 1 });
paperSchema.index({ paperCode: 1 });

// Export Model
module.exports = mongoose.model("Paper", paperSchema);