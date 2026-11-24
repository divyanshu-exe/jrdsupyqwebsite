const multer = require("multer");

// Memory Storage
const storage = multer.memoryStorage();

// File Filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF and Image files (JPEG, PNG, WEBP) are allowed."));
    }
};

// 15 MB File Size Limit to protect server memory
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15 MB
    },
});

module.exports = upload;