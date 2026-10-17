const jwt = require("jsonwebtoken");
require("dotenv").config();

// ✅ Verify JWT Token Middleware
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  const token = authHeader.split(" ")[1];
  console.log("Token:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded); // 🔥 Debug log

    req.user = decoded; // Attach user info to request object
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ✅ Check if User is Driver Middleware
exports.verifyDriver = (req, res, next) => {
  console.log("User in verifyDriver:", req.user);
  if (req.user.role !== "Driver") {
    return res.status(403).json({ error: "Access denied. Only drivers can perform this action." });
  }
  next();
};
