import { Request, Response } from 'express';
import { User } from '../../models/user.model';
import { generateRandomNickname, generateRandomColor, generateUserId } from '@libs/utils';

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Generate user data
    const userId = generateUserId();
    const nickname = generateRandomNickname();
    const color = generateRandomColor();
    
    console.log(`🆔 Creating new user: ${userId}, nickname: ${nickname}, color: ${color}`);
    
    // Create user in database
    const user = new User({
      userId,
      nickname,
      color,
    });
    
    await user.save();
    
    // Set session cookie
    res.cookie('userId', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    
    console.log(`✅ User created successfully: ${userId}`);
    
    // Return user data (excluding internal fields)
    res.status(201).json({
      userId,
      nickname,
      color,
    });
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    
    // Handle duplicate userId (unlikely but possible)
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      res.status(409).json({
        error: 'Conflict',
        message: 'User already exists',
        statusCode: 409,
      });
      return;
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create user',
      statusCode: 500,
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.cookies.userId;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No user session found',
        statusCode: 401,
      });
      return;
    }
    
    const user = await User.findOne({ userId });
    
    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
        statusCode: 404,
      });
      return;
    }
    
    res.json({
      userId: user.userId,
      nickname: user.nickname,
      color: user.color,
    });
    
  } catch (error) {
    console.error('❌ Error fetching current user:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user',
      statusCode: 500,
    });
  }
};