const mongoose = require("mongoose");

function connectDB(uri) {
    return mongoose.connect(uri)
        .then(() => console.log("✅ MongoDB connected"))
        .catch(err => console.error("MongoDB connection error:", err));
}

module.exports = connectDB;
