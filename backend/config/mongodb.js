// config/mongodb.js

import mongoose from "mongoose";
import dns from "dns";

/**
 * Connects to MongoDB, with logging and fatal fail on error.
 * No deprecated options (as of Mongoose v6+).
 */
export const connectDB = async () => {
  try {
    // Attempt to use Google DNS to bypass local resolver issues for SRV records
    try {
      dns.setServers(["8.8.8.8", "8.8.4.4"]);
      console.log("✅ Custom DNS servers set for SRV resolution");
    } catch (e) {
      console.warn("⚠️ Could not set custom DNS servers:", e.message);
    }

    if (!process.env.MONGO_URI) {
      throw new Error("[MONGO] Missing MONGO_URI in env!");
    }
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      family: 4 // Force IPv4 to avoid potential IPv6 issues
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Check for common specific errors
    if (error.code === 'ENOTFOUND') {
      console.error("   -> This suggests the database address is wrong or the cluster is paused/deleted.");
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error("   -> Network connection refused. Check IP Whitelist in MongoDB Atlas or Firewall.");
    }
    process.exit(1); // Fail hard if DB is not available (safer for prod)
  }
};
