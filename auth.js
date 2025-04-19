const express = require('express');
const router = express.Router();
const authController = require('../controllers/authcontroller');

// Sample Test Route
router.get('/test', (req, res) => {
  console.log("Test route hit");
  res.send("🚀 Auth routes are working!");
});

// Register Route
router.post('/register', (req, res) => {
  authController.register(req, res);
});

// Login Route
router.post('/login', (req, res) => {
  console.log("Login route hit");
  authController.login(req, res);
});

module.exports = router;
