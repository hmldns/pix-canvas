import { Router } from 'express';
import { getPixels, getPixelsInRegion } from '../controllers/pixel.controller';

const router = Router();

// GET /api/pixels - Get the current state of the entire canvas
router.get('/', getPixels);

// GET /api/pixels/region - Get pixels in a specific region (query params: minX, minY, maxX, maxY)
router.get('/region', getPixelsInRegion);

export default router;