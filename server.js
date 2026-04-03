const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mevyn backend is running",
    environment: process.env.NODE_ENV || "development",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
