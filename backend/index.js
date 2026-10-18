
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const rideRoutes = require("./routes/rides");
const bookingroutes = require("./routes/bookings");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const reviewRoutes = require("./routes/review");
const driverRoutes = require("./routes/driver");
const healthRoutes = require("./routes/health");

const app = express();

app.use(express.json());
app.use(cors());

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) {
        console.log("Database Connection Failed", err);
    } else {
        console.log("Connected to MySQL Database");
    }
});

// Initialize Razorpay only when both credentials are available
const razorpay =
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
        ? new Razorpay({
              key_id: process.env.RAZORPAY_KEY_ID,
              key_secret: process.env.RAZORPAY_KEY_SECRET,
          })
        : null;

// Create payment order
app.post("/create-order", async (req, res) => {
    if (!razorpay) {
        return res.status(503).json({
            message: "Payment functionality is currently unavailable",
        });
    }

    try {
        const options = {
            amount: req.body.amount * 100,
            currency: "INR",
            receipt: "order_rcptid_" + Math.floor(Math.random() * 1000),
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify payment signature
app.post("/verify-payment", async (req, res) => {
    if (!razorpay) {
        return res.status(503).json({
            success: false,
            message: "Payment functionality is currently unavailable",
        });
    }

    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        bookingId,
        amount,
    } = req.body;

    const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

    if (generated_signature === razorpay_signature) {
        const insertQuery =
    "INSERT INTO payments (booking_id, amount, payment_status) VALUES (?, ?, ?)";

        db.query(
            insertQuery,
            [bookingId, amount, "SUCCESS"],
            (err, result) => {
                if (err) {
                    console.error("Failed to insert payment record:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Database insert failed",
                    });
                }

                console.log("Payment recorded:", result.insertId);
                res.json({
                    success: true,
                    message: "Payment verified and recorded successfully",
                });
            }
        );
    } else {
        res.status(400).json({
            success: false,
            message: "Payment verification failed",
        });
    }
});

// Routes
app.use("/health", healthRoutes);

app.use("/api", authRoutes);

console.log("Rides loading");
app.use("/api/rides", rideRoutes);
app.use("/api", bookingroutes);
app.use("/reviews", reviewRoutes);
app.use("/api/drivers", driverRoutes);

// Root route
app.get("/", (req, res) => {
    res.send("Ecoride API is Running");
});

// Start server only when this file is executed directly
if (require.main === module) {
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log("Server running on port " + PORT);
    });
}

module.exports = app;