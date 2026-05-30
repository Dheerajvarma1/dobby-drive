const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImage, getRawImage, deleteImage } = require('../controllers/imageController');
const { protect } = require('../middleware/auth');

// Configure Multer memory storage
const storage = multer.memoryStorage();

// File filter to accept only image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB file size limit
  },
});

// Middleware for routes
router.use(protect); // Secure all image routes

// Upload image (requires 'image' field in form data)
router.post('/upload', upload.single('image'), uploadImage);

// Get raw image stream (for img tags)
router.get('/:imageId/raw', getRawImage);

// Delete image
router.delete('/:imageId', deleteImage);

module.exports = router;
