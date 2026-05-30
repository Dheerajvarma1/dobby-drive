const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer = null;

const connectDB = async () => {
  const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dobby-drive';
  
  try {
    // Attempt standard connection
    console.log(`Connecting to database: ${connStr}...`);
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 2000, // Quick timeout if server isn't running
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log('--------------------------------------------------');
    console.warn(`Local MongoDB connection failed: ${error.message}`);
    console.log('Spinning up an in-memory virtual MongoDB server...');
    console.log('--------------------------------------------------');
    
    try {
      // Initialize in-memory MongoDB server
      mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'dobby-drive'
        }
      });
      const memoryUri = mongoServer.getUri();
      
      console.log(`Virtual MongoDB Server ready. Connecting to: ${memoryUri}`);
      const conn = await mongoose.connect(memoryUri);
      console.log(`MongoDB Connected (In-Memory Virtual Server): ${conn.connection.host}`);
    } catch (innerError) {
      console.error(`Fatal database connection error: ${innerError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
