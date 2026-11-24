const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required.",
            });
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const jwtSecret = process.env.JWT_SECRET;

        if (!adminEmail || !adminPassword || !jwtSecret) {
            console.error("Admin credentials or JWT_SECRET are missing in .env");
            return res.status(500).json({
                success: false,
                message: "Server authentication configuration error.",
            });
        }

        const emailMatches = email.trim().toLowerCase() === adminEmail.trim().toLowerCase();

        // Support bcrypt hash if stored in ADMIN_PASSWORD, or plain-text string comparison
        let passwordMatches = false;
        if (adminPassword.startsWith("$2a$") || adminPassword.startsWith("$2b$") || adminPassword.startsWith("$2y$")) {
            passwordMatches = await bcrypt.compare(password, adminPassword);
        } else {
            passwordMatches = password === adminPassword;
        }

        if (!emailMatches || !passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const token = jwt.sign(
            {
                email: adminEmail,
                role: "admin",
            },
            jwtSecret,
            {
                expiresIn: "7d",
            }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    login,
};
