import mongoose from 'mongoose';
import config from '../config';

export async function connectToDatabase(): Promise<void> {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(config.mongodbUri, {
      // Connection options for production reliability
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });
    
    console.log(`✅ Successfully connected to MongoDB: ${config.mongodbUri}`);
    
    // Create indexes for performance
    await createIndexes();
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

export async function createIndexes(): Promise<void> {
  try {
    console.log('📊 Creating database indexes...');
    
    const db = mongoose.connection.db;
    
    // Users collection indexes
    await db.collection('users').createIndex({ userId: 1 }, { unique: true });
    console.log('✅ Created unique index on users.userId');
    
    // Pixels collection indexes
    await db.collection('pixels').createIndex({ x: 1, y: 1 });
    console.log('✅ Created compound index on pixels.x and pixels.y');
    
    await db.collection('pixels').createIndex({ timestamp: -1 });
    console.log('✅ Created index on pixels.timestamp');
    
    await db.collection('pixels').createIndex({ userId: 1 });
    console.log('✅ Created index on pixels.userId');
    
    // Compound index for efficient canvas state queries
    await db.collection('pixels').createIndex({ x: 1, y: 1, timestamp: -1 });
    console.log('✅ Created compound index on pixels.x, pixels.y, and pixels.timestamp');
    
  } catch (error) {
    console.error('❌ Failed to create indexes:', error);
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
}

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Mongoose connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 Mongoose disconnected from MongoDB');
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await disconnectFromDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
});