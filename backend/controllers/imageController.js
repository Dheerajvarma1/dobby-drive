const Image = require('../models/Image');
const Folder = require('../models/Folder');

// @desc    Upload an image
// @route   POST /api/images/upload
// @access  Private
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please select an image file to upload' });
    }

    const { name, parent } = req.body;
    const parentId = parent === 'root' || !parent ? null : parent;

    // If parent is specified, verify that the user owns the parent folder
    if (parentId) {
      const parentFolder = await Folder.findOne({ _id: parentId, owner: req.user._id });
      if (!parentFolder) {
        return res.status(404).json({ message: 'Parent folder not found or access denied' });
      }
    }

    // Determine final name of the image
    const finalName = (name && name.trim()) || req.file.originalname;

    // Check size limit: MongoDB documents have a 16MB limit.
    // Multer size limit is set, but we verify here as well.
    const MAX_SIZE = 14 * 1024 * 1024; // 14MB safety threshold for BSON overhead
    if (req.file.size > MAX_SIZE) {
      return res.status(400).json({ message: 'Image size exceeds maximum limit of 14MB' });
    }

    // Create Image
    const image = await Image.create({
      name: finalName,
      data: req.file.buffer,
      contentType: req.file.mimetype,
      size: req.file.size,
      parent: parentId,
      owner: req.user._id,
    });

    // Return the response without the raw binary buffer (it's too large!)
    return res.status(201).json({
      _id: image._id,
      name: image.name,
      contentType: image.contentType,
      size: image.size,
      parent: image.parent,
      owner: image.owner,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    });
  } catch (error) {
    console.error('Upload Image Error:', error);
    return res.status(500).json({ message: 'Server error uploading image', error: error.message });
  }
};

// @desc    Get raw image buffer for viewing
// @route   GET /api/images/:imageId/raw
// @access  Private (though can also be public if token is passed via query param or headers)
const getRawImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    // Allow auth via query token if needed, but standard token header works for our frontend.
    const image = await Image.findOne({ _id: imageId, owner: req.user._id });
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found or access denied' });
    }

    // Set response headers and send raw buffer
    res.set('Content-Type', image.contentType);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    return res.send(image.data);
  } catch (error) {
    console.error('Get Raw Image Error:', error);
    return res.status(500).json({ message: 'Server error retrieving image file' });
  }
};

// @desc    Delete an image
// @route   DELETE /api/images/:imageId
// @access  Private
const deleteImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const image = await Image.findOne({ _id: imageId, owner: req.user._id });
    if (!image) {
      return res.status(404).json({ message: 'Image not found or access denied' });
    }

    await Image.deleteOne({ _id: imageId, owner: req.user._id });

    return res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete Image Error:', error);
    return res.status(500).json({ message: 'Server error deleting image' });
  }
};

module.exports = {
  uploadImage,
  getRawImage,
  deleteImage,
};
