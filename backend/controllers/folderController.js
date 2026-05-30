const Folder = require('../models/Folder');
const Image = require('../models/Image');

// Helper function to recursively calculate size of a folder
const calculateFolderSize = async (folderId) => {
  // Get direct images
  const images = await Image.find({ parent: folderId }).select('size');
  let size = images.reduce((acc, img) => acc + (img.size || 0), 0);

  // Get direct subfolders
  const subfolders = await Folder.find({ parent: folderId }).select('_id');
  for (const subfolder of subfolders) {
    size += await calculateFolderSize(subfolder._id);
  }

  return size;
};

// Helper function to recursively delete folders and their contents
const deleteFolderRecursive = async (folderId, ownerId) => {
  // Delete all images in this folder
  await Image.deleteMany({ parent: folderId, owner: ownerId });

  // Find subfolders
  const subfolders = await Folder.find({ parent: folderId, owner: ownerId }).select('_id');
  for (const subfolder of subfolders) {
    await deleteFolderRecursive(subfolder._id, ownerId);
  }

  // Delete the folder itself
  await Folder.deleteOne({ _id: folderId, owner: ownerId });
};

// @desc    Create a new folder
// @route   POST /api/folders
// @access  Private
const createFolder = async (req, res) => {
  try {
    const { name, parent } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    const parentId = parent || null;

    // Check if folder with same name exists under the parent for this user
    const folderExists = await Folder.findOne({
      name: name.trim(),
      parent: parentId,
      owner: req.user._id,
    });

    if (folderExists) {
      return res.status(400).json({ message: 'A folder with this name already exists here' });
    }

    const folder = await Folder.create({
      name: name.trim(),
      parent: parentId,
      owner: req.user._id,
    });

    return res.status(201).json(folder);
  } catch (error) {
    console.error('Create Folder Error:', error);
    return res.status(500).json({ message: 'Server error creating folder', error: error.message });
  }
};

// @desc    Get contents of a folder (subfolders & images)
// @route   GET /api/folders/:folderId? (folderId is optional, defaults to root)
// @access  Private
const getFolderContents = async (req, res) => {
  try {
    const folderId = req.params.folderId === 'root' || !req.params.folderId ? null : req.params.folderId;

    // Verify parent folder exists and is owned by this user
    let currentFolder = null;
    let breadcrumbs = [];

    if (folderId) {
      currentFolder = await Folder.findOne({ _id: folderId, owner: req.user._id });
      if (!currentFolder) {
        return res.status(404).json({ message: 'Folder not found or access denied' });
      }

      // Generate breadcrumbs recursively
      let tempFolder = currentFolder;
      breadcrumbs.unshift({ _id: tempFolder._id, name: tempFolder.name });
      while (tempFolder.parent) {
        tempFolder = await Folder.findOne({ _id: tempFolder.parent, owner: req.user._id });
        if (!tempFolder) break;
        breadcrumbs.unshift({ _id: tempFolder._id, name: tempFolder.name });
      }
    }

    // Get subfolders in this directory
    const folders = await Folder.find({ parent: folderId, owner: req.user._id }).sort({ createdAt: -1 });

    // Enhance folders with recursive size and file counts
    const enhancedFolders = [];
    for (const folder of folders) {
      const size = await calculateFolderSize(folder._id);
      enhancedFolders.push({
        _id: folder._id,
        name: folder.name,
        parent: folder.parent,
        owner: folder.owner,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        size,
      });
    }

    // Get images in this directory
    // Project only necessary fields (exclude binary data to speed up listings!)
    const images = await Image.find({ parent: folderId, owner: req.user._id })
      .select('name size contentType createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Calculate current folder's total size
    let currentFolderSize = 0;
    if (folderId) {
      currentFolderSize = await calculateFolderSize(folderId);
    } else {
      // For root, get size of all images at root plus recursive size of all root folders
      const rootImages = await Image.find({ parent: null, owner: req.user._id }).select('size');
      const rootImagesSize = rootImages.reduce((acc, img) => acc + (img.size || 0), 0);

      let rootFoldersSize = 0;
      const rootFolders = await Folder.find({ parent: null, owner: req.user._id }).select('_id');
      for (const f of rootFolders) {
        rootFoldersSize += await calculateFolderSize(f._id);
      }
      currentFolderSize = rootImagesSize + rootFoldersSize;
    }

    return res.json({
      currentFolder: currentFolder ? {
        _id: currentFolder._id,
        name: currentFolder.name,
        size: currentFolderSize,
      } : { _id: 'root', name: 'All Files', size: currentFolderSize },
      breadcrumbs,
      folders: enhancedFolders,
      images,
    });
  } catch (error) {
    console.error('Get Folder Contents Error:', error);
    return res.status(500).json({ message: 'Server error retrieving folder contents', error: error.message });
  }
};

// @desc    Get folder size recursively
// @route   GET /api/folders/:folderId/size
// @access  Private
const getFolderSize = async (req, res) => {
  try {
    const { folderId } = req.params;

    if (!folderId || folderId === 'root') {
      // Calculate root size
      const rootImages = await Image.find({ parent: null, owner: req.user._id }).select('size');
      const rootImagesSize = rootImages.reduce((acc, img) => acc + (img.size || 0), 0);

      let rootFoldersSize = 0;
      const rootFolders = await Folder.find({ parent: null, owner: req.user._id }).select('_id');
      for (const f of rootFolders) {
        rootFoldersSize += await calculateFolderSize(f._id);
      }
      return res.json({ size: rootImagesSize + rootFoldersSize });
    }

    // Verify folder exists and is owned by user
    const folder = await Folder.findOne({ _id: folderId, owner: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found or access denied' });
    }

    const totalSize = await calculateFolderSize(folderId);
    return res.json({ size: totalSize });
  } catch (error) {
    console.error('Get Folder Size Error:', error);
    return res.status(500).json({ message: 'Server error calculating folder size' });
  }
};

// @desc    Delete folder and all recursive subfolders and images
// @route   DELETE /api/folders/:folderId
// @access  Private
const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;

    if (!folderId || folderId === 'root') {
      return res.status(400).json({ message: 'Cannot delete root folder' });
    }

    const folder = await Folder.findOne({ _id: folderId, owner: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found or access denied' });
    }

    await deleteFolderRecursive(folderId, req.user._id);

    return res.json({ message: 'Folder and all its contents deleted successfully' });
  } catch (error) {
    console.error('Delete Folder Error:', error);
    return res.status(500).json({ message: 'Server error deleting folder' });
  }
};

module.exports = {
  createFolder,
  getFolderContents,
  getFolderSize,
  deleteFolder,
};
