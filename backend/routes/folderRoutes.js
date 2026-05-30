const express = require('express');
const router = express.Router();
const { createFolder, getFolderContents, getFolderSize, deleteFolder } = require('../controllers/folderController');
const { protect } = require('../middleware/auth');

router.use(protect); // All folder routes are private

router.route('/')
  .post(createFolder);

router.route('/size/:folderId')
  .get(getFolderSize);

router.route('/:folderId')
  .get(getFolderContents)
  .delete(deleteFolder);

router.route('/')
  .get(getFolderContents); // For root list /api/folders

module.exports = router;
