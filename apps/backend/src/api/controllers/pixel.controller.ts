import { Request, Response } from 'express';
import { Pixel } from '../../models/pixel.model';

export const getPixels = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📊 Fetching current canvas state...');
    
    // Get current canvas state using the aggregation method
    const pixels = await (Pixel as any).getCurrentCanvasState();
    
    console.log(`✅ Retrieved ${pixels.length} pixels from canvas`);
    
    // Transform to match API specification
    const transformedPixels = pixels.map((pixel: any) => ({
      x: pixel.x,
      y: pixel.y,
      color: pixel.color,
    }));
    
    res.json({
      pixels: transformedPixels,
    });
    
  } catch (error) {
    console.error('❌ Error fetching canvas state:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch canvas state',
      statusCode: 500,
    });
  }
};

export const getPixelsBinary = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📊 Fetching current canvas state in binary format...');
    
    // Get current canvas state using the aggregation method
    const pixels = await (Pixel as any).getCurrentCanvasState();
    
    console.log(`✅ Retrieved ${pixels.length} pixels from canvas (binary mode)`);
    
    // Create 8-byte aligned buffer
    const buffer = Buffer.allocUnsafe(pixels.length * 8);
    
    pixels.forEach((pixel: any, index: number) => {
      const offset = index * 8;
      
      // Parse hex color to RGB
      const color = pixel.color.replace('#', '');
      const r = parseInt(color.substr(0, 2), 16);
      const g = parseInt(color.substr(2, 2), 16);
      const b = parseInt(color.substr(4, 2), 16);
      
      // Write to buffer in little-endian format
      buffer.writeUInt16LE(pixel.x, offset);
      buffer.writeUInt16LE(pixel.y, offset + 2);
      buffer.writeUInt8(r, offset + 4);
      buffer.writeUInt8(g, offset + 5);
      buffer.writeUInt8(b, offset + 6);
      buffer.writeUInt8(0, offset + 7); // padding byte for 8-byte alignment
    });
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Pixel-Count', pixels.length.toString());
    res.setHeader('Content-Length', buffer.length.toString());
    
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Error fetching canvas state (binary):', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch canvas state in binary format',
      statusCode: 500,
    });
  }
};

export const getPixelsInRegion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { minX, minY, maxX, maxY } = req.query;
    
    // Validate query parameters
    if (!minX || !minY || !maxX || !maxY) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'minX, minY, maxX, and maxY query parameters are required',
        statusCode: 400,
      });
      return;
    }
    
    const minXNum = parseInt(minX as string, 10);
    const minYNum = parseInt(minY as string, 10);
    const maxXNum = parseInt(maxX as string, 10);
    const maxYNum = parseInt(maxY as string, 10);
    
    // Validate coordinates
    if (isNaN(minXNum) || isNaN(minYNum) || isNaN(maxXNum) || isNaN(maxYNum)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Coordinates must be valid integers',
        statusCode: 400,
      });
      return;
    }
    
    if (minXNum < 0 || minYNum < 0 || maxXNum >= 5000 || maxYNum >= 5000) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Coordinates must be within canvas bounds (0-4999)',
        statusCode: 400,
      });
      return;
    }
    
    if (minXNum > maxXNum || minYNum > maxYNum) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Min coordinates must be less than or equal to max coordinates',
        statusCode: 400,
      });
      return;
    }
    
    console.log(`📊 Fetching pixels in region: (${minXNum},${minYNum}) to (${maxXNum},${maxYNum})`);
    
    // Get pixels in the specified region
    const pixels = await (Pixel as any).getPixelsInRegion(minXNum, minYNum, maxXNum, maxYNum);
    
    console.log(`✅ Retrieved ${pixels.length} pixels from region`);
    
    // Transform to match API specification
    const transformedPixels = pixels.map((pixel: any) => ({
      x: pixel.x,
      y: pixel.y,
      color: pixel.color,
    }));
    
    res.json({
      pixels: transformedPixels,
    });
    
  } catch (error) {
    console.error('❌ Error fetching pixels in region:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch pixels in region',
      statusCode: 500,
    });
  }
};