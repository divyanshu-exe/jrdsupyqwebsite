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

// Export Model
module.exports = mongoose.model("Paper", paperSchema);