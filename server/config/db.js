const mongoose = require("mongoose");
const dns = require("dns");

// Windows ISP DNS resolvers often fail SRV record lookups for mongodb+srv
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Fallback gracefully if custom DNS servers cannot be set
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected successfully: ${conn.connection.host}`);

    // Ensure all existing legacy crew documents have verificationStatus set to APPROVED (Part B3)
    try {
      const CollectionCrew = require("../models/CollectionCrew");
      await CollectionCrew.updateMany(
        { $or: [{ verificationStatus: { $exists: false } }, { verificationStatus: null }] },
        { $set: { verificationStatus: "APPROVED", verifiedAt: new Date() } }
      );
    } catch (migErr) {
      // Non-blocking on initial boot
    }
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
