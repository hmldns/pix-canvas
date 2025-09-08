import { Router } from 'express';
import { getPixels, getPixelsInRegion, getPixelsBinary } from '../controllers/pixel.controller';

const router = Router();

// GET /api/pixels - Get the current state of the entire canvas
router.get('/', getPixels);

// GET /api/pixels/binary - Get the current state of the entire canvas in binary format
router.get('/binary', getPixelsBinary);

// GET /api/pixels/region - Get pixels in a specific region (query params: minX, minY, maxX, maxY)
router.get('/region', getPixelsInRegion);

export default router;