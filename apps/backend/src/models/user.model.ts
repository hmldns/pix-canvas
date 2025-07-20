import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  userId: string;
  nickname: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  nickname: {
    type: String,
    required: true,
    maxlength: 50,
  },
  color: {
    type: String,
    required: true,
    match: /^#[0-9A-F]{6}$/i, // Validate hex color format
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'users',
});

// Index for faster lookups
userSchema.index({ userId: 1 }, { unique: true });

// Virtual for user display name (if needed)
userSchema.virtual('displayName').get(function() {
  return this.nickname;
});

// Transform output to remove MongoDB-specific fields
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model<IUser>('User', userSchema);