import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDrive } from '../context/DriveContext';
import { API_BASE_URL } from '../context/AuthContext';
import {
  Folder, Upload, Grid, List, Trash2, LogOut,
  Search, ChevronRight, X, Download, Menu,
  HardDrive, FileImage, FolderPlus, Eye, AlertCircle,
  Image as ImageIcon, ArrowLeft, ArrowRight,
} from 'lucide-react';

const fmt = (bytes, d = 1) => {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(d)} ${sizes[i]}`;
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function Dashboard({ onShowToast }) {
  const { user, token, logout } = useAuth();
  const {
    currentFolder, folders, images, breadcrumbs, loading, error,
    searchQuery, setSearchQuery, isUploading, uploadProgress,
    createNewFolder, uploadImageFile, deleteFolder, deleteImage, navigateToFolder,
  } = useDrive();

  const [viewMode,           setViewMode]           = useState('grid');
  const [showCreateFolder,   setShowCreateFolder]   = useState(false);
  const [showUpload,         setShowUpload]         = useState(false);
  const [previewImage,       setPreviewImage]       = useState(null);
  const [mobileOpen,         setMobileOpen]         = useState(false);
  const [confirmDelete,      setConfirmDelete]      = useState(null);

  // browser-style navigation history
  const [navHistory, setNavHistory] = useState(['root']);
  const [navIndex,   setNavIndex]   = useState(0);
  const canGoBack    = navIndex > 0;
  const canGoForward = navIndex < navHistory.length - 1;

  const [newFolderName, setNewFolderName] = useState('');
  const [imageName,     setImageName]     = useState('');
  const [selectedFile,  setSelectedFile]  = useState(null);
  const [dragging,      setDragging]      = useState(false);

  const fileRef = useRef(null);

  const MAX_STORAGE  = 50 * 1024 * 1024;
  const storageUsed  = currentFolder?.size || 0;
  const storagePct   = Math.min(100, (storageUsed / MAX_STORAGE) * 100);
  const totalItems   = folders.length + images.length;
  const isMcpUser    = user?.username === 'mcp_user';
  
  // Check if content was created by MCP user (for AI badge)
  const isMcpContent = (item) => item?.ownerUsername === 'mcp_user';

  // ── handlers ──────────────────────────────────────────────

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await createNewFolder(newFolderName.trim());
      onShowToast(`Folder "${newFolderName}" created`, 'success');
      setNewFolderName('');
      setShowCreateFolder(false);
    } catch (err) {
      onShowToast(err.message || 'Failed to create folder', 'error');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      setSelectedFile(file); setImageName(file.name);
    } else {
      onShowToast('Only image files are supported', 'error');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    const name = imageName.trim() || selectedFile.name;
    try {
      await uploadImageFile(name, selectedFile);
      onShowToast(`"${name}" uploaded`, 'success');
      setSelectedFile(null); setImageName(''); setShowUpload(false);
    } catch (err) {
      onShowToast(err.message || 'Upload failed', 'error');
    }
  };

  const confirmDel = (type, id, name) => setConfirmDelete({ type, id, name });

  const execDelete = async () => {
    if (!confirmDelete) return;
    const { type, id, name } = confirmDelete;
    try {
      if (type === 'folder') await deleteFolder(id);
      else await deleteImage(id);
      onShowToast(`"${name}" deleted`, 'success');
    } catch (err) {
      onShowToast(err.message || 'Delete failed', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const closeUploadModal = () => {
    if (!isUploading) { setShowUpload(false); setSelectedFile(null); setImageName(''); }
  };

  // history-aware navigation
  const handleNavigate = (folderId) => {
    const newHistory = navHistory.slice(0, navIndex + 1);
    newHistory.push(folderId);
    setNavHistory(newHistory);
    setNavIndex(newHistory.length - 1);
    navigateToFolder(folderId);
  };

  const goBack = () => {
    if (!canGoBack) return;
    const idx = navIndex - 1;
    setNavIndex(idx);
    navigateToFolder(navHistory[idx]);
  };

  const goForward = () => {
    if (!canGoForward) return;
    const idx = navIndex + 1;
    setNavIndex(idx);
    navigateToFolder(navHistory[idx]);
  };

  // ── render ─────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {mobileOpen && <div className="sidebar-back" onClick={() => setMobileOpen(false)} />}

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon"><Folder size={15} /></div>
          <span className="sidebar-brand-name">Dobby Drive</span>
        </div>

        <nav className="sidebar-nav">
          <div
            className="sidebar-nav-item active"
            onClick={() => { handleNavigate('root'); setMobileOpen(false); }}
          >
            <HardDrive size={15} />
            <span>My Storage</span>
          </div>
        </nav>

        <div className="sidebar-storage">
          <div className="storage-row">
            <span>Storage</span>
            <span>{fmt(storageUsed)}</span>
          </div>
          <div className="storage-track">
            <div className="storage-fill" style={{ width: `${storagePct}%` }} />
          </div>
          <div className="storage-sub">{fmt(storageUsed)} of {fmt(MAX_STORAGE)} used</div>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{user?.username?.slice(0, 2) || 'ME'}</div>
          <div className="user-info">
            <div className="user-name">{user?.username}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button className="logout-btn" onClick={logout} title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-btn" onClick={() => setMobileOpen(true)}>
              <Menu size={17} />
            </button>

            {/* back / forward */}
            <div className="nav-arrows">
              <button
                className="nav-arrow-btn"
                onClick={goBack}
                disabled={!canGoBack}
                title="Back"
              >
                <ArrowLeft size={15} />
              </button>
              <button
                className="nav-arrow-btn"
                onClick={goForward}
                disabled={!canGoForward}
                title="Forward"
              >
                <ArrowRight size={15} />
              </button>
            </div>

            <div className="breadcrumbs">
              <span
                className={`crumb ${!breadcrumbs.length ? 'active' : ''}`}
                onClick={() => handleNavigate('root')}
              >
                All Files
              </span>
              {breadcrumbs.map((c, i) => (
                <React.Fragment key={c._id}>
                  <ChevronRight size={12} className="crumb-sep" />
                  <span
                    className={`crumb ${i === breadcrumbs.length - 1 ? 'active' : ''}`}
                    onClick={() => handleNavigate(c._id)}
                  >
                    {c.name}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="search-wrap">
            <Search size={13} className="search-icon-abs" />
            <input
              type="text"
              className="search-input"
              placeholder="Search files…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {/* MCP banner */}
        {isMcpUser && (
          <div className="mcp-banner">
            <span className="mcp-badge">AI</span>
            <span>You are viewing the <strong>MCP user account</strong>. All folders and images here were created by the AI assistant via the MCP server — not through the web UI.</span>
          </div>
        )}

        {/* Content */}
        <div className="content">
          <div className="content-header">
            <div>
              <div className="folder-title">{currentFolder?.name || 'All Files'}</div>
              {totalItems > 0 && (
                <div className="folder-subtitle">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'} · {fmt(storageUsed)}
                </div>
              )}
            </div>
            <div className="action-group">
              <button className="btn btn-secondary" onClick={() => setShowCreateFolder(true)}>
                <FolderPlus size={13} /><span>New Folder</span>
              </button>
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                <Upload size={13} /><span>Upload</span>
              </button>
              <div className="view-toggle">
                <button
                  className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid"
                >
                  <Grid size={13} />
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List"
                >
                  <List size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="auth-err" style={{ marginBottom: 18 }}>
              <AlertCircle size={13} /><span>{error}</span>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
              <div className="spinner" style={{ width: 26, height: 26 }} />
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading…</span>
            </div>

          /* Empty */
          ) : totalItems === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><ImageIcon size={26} /></div>
              <div className="empty-title">Nothing here yet</div>
              <div className="empty-sub">Create a folder or upload images to get started.</div>
            </div>

          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

              {/* ── FOLDERS ── */}
              {folders.length > 0 && (
                <div>
                  <div className="section-label">
                    <Folder size={10} />
                    Folders ({folders.length})
                  </div>

                  {viewMode === 'grid' ? (
                    <div className="file-grid">
                      {folders.map((f) => (
                        <div
                          key={f._id}
                          className="folder-card"
                          onClick={() => handleNavigate(f._id)}
                        >
                          <div className="folder-card-top">
                            <div className="folder-icon-wrap"><Folder size={19} /></div>
                            <button
                              className="card-del-btn"
                              onClick={(e) => { e.stopPropagation(); confirmDel('folder', f._id, f.name); }}
                              title="Delete folder"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5, width: '100%', minWidth: 0, marginBottom: 3 }}>
                            <div className="folder-name" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                              {f.name}
                            </div>
                            {isMcpContent(f) && <span className="mcp-item-badge" style={{ margin: 0, flexShrink: 0 }}>AI</span>}
                          </div>
                          <div className="folder-size">{fmt(f.size || 0)}</div>
                          {confirmDelete?.id === f._id && (
                            <div className="del-confirm-overlay" onClick={(e) => e.stopPropagation()}>
                              <div className="del-confirm-title">Delete "{f.name}"?</div>
                              <div className="del-confirm-sub">Cannot be undone</div>
                              <div className="del-confirm-btns">
                                <button className="del-no"  onClick={() => setConfirmDelete(null)}>Cancel</button>
                                <button className="del-yes" onClick={execDelete}>Delete</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="file-list">
                      <div className="list-head">
                        <span className="list-head-cell">Name</span>
                        <span className="list-head-cell">Size</span>
                        <span className="list-head-cell">Created</span>
                        <span className="list-head-cell" />
                      </div>
                      {folders.map((f) => (
                        <div key={f._id} className="list-row" onClick={() => handleNavigate(f._id)}>
                          <div className="list-cell-name">
                            <Folder size={15} style={{ color: '#000000', flexShrink: 0 }} />
                            <span>{f.name}</span>
                            {isMcpContent(f) && <span className="mcp-item-badge">AI</span>}
                          </div>
                          <div className="list-cell-size">{fmt(f.size || 0)}</div>
                          <div className="list-cell-date">{fmtDate(f.createdAt)}</div>
                          <div className="list-cell-actions">
                            <button
                              className="btn btn-ghost btn-icon"
                              style={{ width: 26, height: 26, color: 'var(--text-3)' }}
                              onClick={(e) => { e.stopPropagation(); confirmDel('folder', f._id, f.name); }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── IMAGES ── */}
              {images.length > 0 && (
                <div>
                  <div className="section-label">
                    <FileImage size={10} />
                    Images ({images.length})
                  </div>

                  {viewMode === 'grid' ? (
                    <div className="file-grid">
                      {images.map((img) => (
                        <div
                          key={img._id}
                          className="image-card"
                          onClick={() => setPreviewImage(img)}
                        >
                          <div className="image-thumb">
                            <img
                              src={`${API_BASE_URL}/images/${img._id}/raw?token=${token}`}
                              alt={img.name}
                              loading="lazy"
                            />
                            <div className="image-thumb-overlay">
                              <Eye size={20} className="thumb-eye" />
                            </div>
                          </div>
                          <div className="image-info">
                            <div className="image-meta">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, minWidth: 0, width: '100%' }}>
                                <div className="image-name" style={{ margin: 0, flex: 1, minWidth: 0 }}>{img.name}</div>
                                {isMcpContent(img) && <span className="mcp-item-badge" style={{ flexShrink: 0, margin: 0 }}>AI</span>}
                              </div>
                              <div className="image-sz">{fmt(img.size)}</div>
                            </div>
                            <button
                              className="card-del-btn"
                              style={{ opacity: 1 }}
                              onClick={(e) => { e.stopPropagation(); confirmDel('image', img._id, img.name); }}
                              title="Delete image"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          {confirmDelete?.id === img._id && (
                            <div className="del-confirm-overlay" onClick={(e) => e.stopPropagation()}>
                              <div className="del-confirm-title">Delete "{img.name}"?</div>
                              <div className="del-confirm-sub">Cannot be undone</div>
                              <div className="del-confirm-btns">
                                <button className="del-no"  onClick={() => setConfirmDelete(null)}>Cancel</button>
                                <button className="del-yes" onClick={execDelete}>Delete</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="file-list">
                      <div className="list-head">
                        <span className="list-head-cell">Name</span>
                        <span className="list-head-cell">Size</span>
                        <span className="list-head-cell">Uploaded</span>
                        <span className="list-head-cell" />
                      </div>
                      {images.map((img) => (
                        <div key={img._id} className="list-row" onClick={() => setPreviewImage(img)}>
                          <div className="list-cell-name">
                            <FileImage size={15} style={{ color: 'rgba(0,0,0,0.35)', flexShrink: 0 }} />
                            <span>{img.name}</span>
                            {isMcpContent(img) && <span className="mcp-item-badge">AI</span>}
                          </div>
                          <div className="list-cell-size">{fmt(img.size)}</div>
                          <div className="list-cell-date">{fmtDate(img.createdAt)}</div>
                          <div className="list-cell-actions">
                            <button
                              className="btn btn-ghost btn-icon"
                              style={{ width: 26, height: 26, color: 'var(--text-3)' }}
                              onClick={(e) => { e.stopPropagation(); confirmDel('image', img._id, img.name); }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── CREATE FOLDER MODAL ── */}
      {showCreateFolder && (
        <div className="modal-backdrop" onClick={() => setShowCreateFolder(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">New Folder</span>
              <button className="modal-close-btn" onClick={() => setShowCreateFolder(false)}>
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder}>
              <div className="modal-body">
                <div className="field">
                  <label className="field-label">Folder Name</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="e.g. Vacation Photos"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateFolder(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!newFolderName.trim()}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── UPLOAD MODAL ── */}
      {showUpload && (
        <div className="modal-backdrop" onClick={closeUploadModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Upload Image</span>
              <button className="modal-close-btn" onClick={closeUploadModal}>
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="modal-body">
                {!selectedFile ? (
                  <div
                    className={`dropzone ${dragging ? 'dragging' : ''}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                  >
                    <div className="dropzone-icon"><Upload size={19} /></div>
                    <div className="dropzone-title">Drop an image here, or click to browse</div>
                    <div className="dropzone-sub">PNG, JPG, GIF, WEBP — up to 14 MB</div>
                    <input
                      ref={fileRef}
                      type="file"
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files[0];
                        if (f) { setSelectedFile(f); setImageName(f.name); }
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="file-chosen">
                      <div className="file-chosen-icon"><FileImage size={17} /></div>
                      <div className="file-chosen-info">
                        <div className="file-chosen-name">{selectedFile.name}</div>
                        <div className="file-chosen-size">{fmt(selectedFile.size)}</div>
                      </div>
                      <button
                        type="button"
                        className="modal-close-btn"
                        onClick={() => { setSelectedFile(null); setImageName(''); }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <div className="field">
                      <label className="field-label">Save as (optional)</label>
                      <input
                        type="text"
                        className="field-input"
                        placeholder="Custom display name"
                        value={imageName}
                        onChange={(e) => setImageName(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {isUploading && (
                  <div>
                    <div className="progress-row">
                      <span>Uploading…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeUploadModal} disabled={isUploading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!selectedFile || isUploading}>
                  {isUploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL (for list view) ── */}
      {confirmDelete && viewMode === 'list' && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Confirm Delete</span>
              <button className="modal-close-btn" onClick={() => setConfirmDelete(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
                Delete <strong style={{ color: 'var(--text-1)' }}>"{confirmDelete.name}"</strong>?
                {confirmDelete.type === 'folder' && ' All contents will also be deleted.'}
                {' This cannot be undone.'}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={execDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGE PREVIEW ── */}
      {previewImage && (
        <div className="preview-backdrop">
          <div className="preview-header">
            <div>
              <div className="preview-title">{previewImage.name}</div>
              <div className="preview-meta">{fmt(previewImage.size)} · {fmtDate(previewImage.createdAt)}</div>
            </div>
            <div className="preview-acts">
              <a
                className="preview-btn"
                href={`${API_BASE_URL}/images/${previewImage._id}/raw?token=${token}`}
                download={previewImage.name}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={13} /><span>Download</span>
              </a>
              <button className="preview-btn" onClick={() => setPreviewImage(null)}>
                <X size={15} />
              </button>
            </div>
          </div>
          <div className="preview-body" onClick={() => setPreviewImage(null)}>
            <img
              className="preview-img"
              src={`${API_BASE_URL}/images/${previewImage._id}/raw?token=${token}`}
              alt={previewImage.name}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
