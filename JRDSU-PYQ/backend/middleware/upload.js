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
        cb(new Error("Only PDF and Image files are allowed."));
    }
};

const upload = multer({
    storage,
    fileFilter,
});

module.exports = upload;