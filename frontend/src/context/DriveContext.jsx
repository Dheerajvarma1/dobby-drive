import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth, API_BASE_URL } from './AuthContext';

const DriveContext = createContext();

export const DriveProvider = ({ children }) => {
  const { token, user } = useAuth();
  
  const [currentFolder, setCurrentFolder] = useState({ _id: 'root', name: 'All Files', size: 0 });
  const [folders, setFolders] = useState([]);
  const [images, setImages] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Track upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch folder contents
  const fetchFolderContents = async (folderId = 'root') => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    try {
      const targetId = folderId === 'root' || !folderId ? '' : `/${folderId}`;
      const response = await fetch(`${API_BASE_URL}/folders${targetId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch folder contents');
      }
      
      setCurrentFolder(data.currentFolder);
      setFolders(data.folders);
      setImages(data.images);
      setBreadcrumbs(data.breadcrumbs || []);
    } catch (err) {
      console.error('Error fetching drive contents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when user logs in or folder updates
  useEffect(() => {
    if (token) {
      fetchFolderContents('root');
    } else {
      setFolders([]);
      setImages([]);
      setBreadcrumbs([]);
      setCurrentFolder({ _id: 'root', name: 'All Files', size: 0 });
    }
  }, [token]);

  // Create folder
  const createNewFolder = async (name) => {
    if (!token) return;
    
    try {
      const parentId = currentFolder._id === 'root' ? null : currentFolder._id;
      const response = await fetch(`${API_BASE_URL}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          parent: parentId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create folder');
      }
      
      // Refresh folder contents to reflect changes
      await fetchFolderContents(currentFolder._id);
      return data;
    } catch (err) {
      console.error('Error creating folder:', err);
      throw err;
    }
  };

  // Upload image
  const uploadImageFile = async (name, file) => {
    if (!token) return;
    
    setIsUploading(true);
    setUploadProgress(10); // Start mock progress
    
    try {
      const parentId = currentFolder._id === 'root' ? null : currentFolder._id;
      const formData = new FormData();
      formData.append('image', file);
      formData.append('name', name);
      if (parentId) {
        formData.append('parent', parentId);
      }
      
      // We can use a standard fetch, but since we want to show a nice loader progress,
      // let's animate the mock progress, then complete it.
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 80) {
            clearInterval(interval);
            return 80;
          }
          return prev + 15;
        });
      }, 200);
      
      const response = await fetch(`${API_BASE_URL}/images/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      clearInterval(interval);
      setUploadProgress(100);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload image');
      }
      
      // Reload current directory
      await fetchFolderContents(currentFolder._id);
      
      // Brief delay to let the user see 100% progress
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 400);
      
      return data;
    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      console.error('Error uploading image:', err);
      throw err;
    }
  };

  // Delete folder
  const deleteFolder = async (folderId) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete folder');
      }
      
      await fetchFolderContents(currentFolder._id);
      return data;
    } catch (err) {
      console.error('Error deleting folder:', err);
      throw err;
    }
  };

  // Delete image
  const deleteImage = async (imageId) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete image');
      }
      
      await fetchFolderContents(currentFolder._id);
      return data;
    } catch (err) {
      console.error('Error deleting image:', err);
      throw err;
    }
  };

  // Navigate to folder
  const navigateToFolder = (folderId) => {
    fetchFolderContents(folderId);
  };

  // Filter folders/files based on search query
  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredImages = images.filter(img => 
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DriveContext.Provider value={{
      currentFolder,
      folders: filteredFolders,
      images: filteredImages,
      breadcrumbs,
      loading,
      error,
      searchQuery,
      setSearchQuery,
      isUploading,
      uploadProgress,
      fetchFolderContents,
      createNewFolder,
      uploadImageFile,
      deleteFolder,
      deleteImage,
      navigateToFolder,
    }}>
      {children}
    </DriveContext.Provider>
  );
};

export const useDrive = () => useContext(DriveContext);
