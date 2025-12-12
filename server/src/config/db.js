import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not set");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000, // Timeout after 30s (increased from 5s)
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 30000, // Connection timeout
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain at least 5 socket connections
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ DB Connection Failed:");
    console.error("==========================================");
    
    if (error.message.includes("authentication failed") || error.message.includes("bad auth")) {
      console.error("🔐 Authentication Error - Check username/password");
    } else if (error.message.includes("IP") || error.message.includes("whitelist")) {
      console.error("🌐 IP Whitelist Error - Add your IP to MongoDB Atlas Network Access");
    } else if (error.message.includes("ECONNREFUSED")) {
      console.error("🔌 Connection Refused - Check network/firewall settings");
    } else if (error.message.includes("ReplicaSetNoPrimary")) {
      console.error("🔄 Replica Set Error - Cluster may be initializing");
    } else if (error.message.includes("timed out") || error.message.includes("timeout")) {
      console.error("⏱️  Connection Timeout Error:");
      console.error("   - MongoDB server took too long to respond");
      console.error("   - Check your internet connection");
      console.error("   - Verify MongoDB Atlas cluster is running and accessible");
      console.error("   - The timeout has been increased to 30 seconds");
      console.error("   - If using MongoDB Atlas, check cluster status in dashboard");
      console.error("   - Ensure your IP is whitelisted in Network Access");
    }
    
    console.error("Full error:", error.message);
    console.error("==========================================");
    process.exit(1);
  }
};

export default connectDB;
