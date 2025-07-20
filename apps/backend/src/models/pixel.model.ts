import mongoose, { Schema, Document } from 'mongoose';

export interface IPixel extends Document {
  x: number;
  y: number;
  color: string;
  timestamp: Date;
  userId: string;
}

const pixelSchema = new Schema<IPixel>({
  x: {
    type: Number,
    required: true,
    min: 0,
    max: 4999, // Canvas is 5000x5000 (0-4999)
    validate: {
      validator: Number.isInteger,
      message: 'X coordinate must be an integer',
    },
  },
  y: {
    type: Number,
    required: true,
    min: 0,
    max: 4999, // Canvas is 5000x5000 (0-4999)
    validate: {
      validator: Number.isInteger,
      message: 'Y coordinate must be an integer',
    },
  },
  color: {
    type: String,
    required: true,
    match: /^#[0-9A-F]{6}$/i, // Validate hex color format
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  userId: {
    type: String,
    required: true,
    ref: 'User', // Reference to User model
  },
}, {
  collection: 'pixels',
});

// Indexes for efficient queries
pixelSchema.index({ x: 1, y: 1 }); // Coordinate lookup
pixelSchema.index({ timestamp: -1 }); // Time-based queries
pixelSchema.index({ userId: 1 }); // User-based queries
pixelSchema.index({ x: 1, y: 1, timestamp: -1 }); // Canvas state queries (last-write-wins)

// Transform output to remove MongoDB-specific fields
pixelSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Static method to get current canvas state
pixelSchema.statics.getCurrentCanvasState = async function() {
  // Aggregate to get the latest pixel for each coordinate
  return this.aggregate([
    {
      $sort: { x: 1, y: 1, timestamp: -1 }
    },
    {
      $group: {
        _id: { x: '$x', y: '$y' },
        latestPixel: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latestPixel' }
    },
    {
      $project: {
        _id: 0,
        x: 1,
        y: 1,
        color: 1,
        timestamp: 1,
        userId: 1
      }
    },
    {
      $sort: { x: 1, y: 1 }
    }
  ]);
};

// Static method to get pixels in a specific region
pixelSchema.statics.getPixelsInRegion = async function(minX: number, minY: number, maxX: number, maxY: number) {
  return this.aggregate([
    {
      $match: {
        x: { $gte: minX, $lte: maxX },
        y: { $gte: minY, $lte: maxY }
      }
    },
    {
      $sort: { x: 1, y: 1, timestamp: -1 }
    },
    {
      $group: {
        _id: { x: '$x', y: '$y' },
        latestPixel: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latestPixel' }
    },
    {
      $project: {
        _id: 0,
        x: 1,
        y: 1,
        color: 1,
        timestamp: 1,
        userId: 1
      }
    },
    {
      $sort: { x: 1, y: 1 }
    }
  ]);
};

export const Pixel = mongoose.model<IPixel>('Pixel', pixelSchema);