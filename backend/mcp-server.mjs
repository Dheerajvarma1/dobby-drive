// MCP uses stdout for JSON-RPC — redirect all console.log to stderr so
// database connection messages don't corrupt the protocol stream.
console.log = (...args) => console.error(...args);

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Folder from './models/Folder.js';
import Image from './models/Image.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Setup environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// Helper to format bytes to human readable string
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Global reference for our dedicated MCP user
let mcpUser = null;

// Connect to MongoDB and get or create MCP user
const initDbAndUser = async () => {
  try {
    await connectDB();
    
    // Find or create a default user for MCP actions
    let user = await User.findOne({ username: 'mcp_user' });
    if (!user) {
      user = await User.create({
        username: 'mcp_user',
        email: 'mcp_user@dobbydrive.com',
        password: 'mcp_secure_password_12345', // Encrypted by User schema pre-save hook
      });
      console.error('MCP dedicated user created successfully.');
    }
    mcpUser = user;
  } catch (error) {
    console.error('Failed to initialize database for MCP:', error.message);
    process.exit(1);
  }
};

// Resolve a path string (e.g. "Projects/Campaigns") to a folder ID
const resolvePath = async (pathString, ownerId) => {
  if (!pathString || pathString.trim() === '' || pathString.trim() === '/') {
    return null;
  }

  const parts = pathString.split('/').filter(p => p.trim() !== '');
  let currentParentId = null;

  for (const part of parts) {
    const folder = await Folder.findOne({
      name: part.trim(),
      parent: currentParentId,
      owner: ownerId,
    });

    if (!folder) {
      throw new Error(`Path component '${part}' not found`);
    }
    currentParentId = folder._id;
  }

  return currentParentId;
};

// Helper to get folder size recursively
const calculateFolderSize = async (folderId) => {
  const images = await Image.find({ parent: folderId }).select('size');
  let size = images.reduce((acc, img) => acc + (img.size || 0), 0);

  const subfolders = await Folder.find({ parent: folderId }).select('_id');
  for (const subfolder of subfolders) {
    size += await calculateFolderSize(subfolder._id);
  }
  return size;
};

// Initialize server
const server = new Server(
  {
    name: 'dobby-drive-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_contents',
        description: 'Lists all folders and images in a given directory path.',
        inputSchema: {
          type: 'object',
          properties: {
            folderPath: {
              type: 'string',
              description: 'The directory path to list contents of (e.g., "Projects/Campaigns"). Leave empty or pass "/" for root.',
            },
          },
        },
      },
      {
        name: 'create_folder',
        description: 'Creates a nested folder in the drive at the specified path.',
        inputSchema: {
          type: 'object',
          properties: {
            folderName: {
              type: 'string',
              description: 'The name of the new folder to create.',
            },
            parentPath: {
              type: 'string',
              description: 'The parent path where the folder should be created (e.g., "Projects"). Leave empty or pass "/" for root.',
            },
          },
          required: ['folderName'],
        },
      },
      {
        name: 'upload_image',
        description: 'Uploads a base64 encoded image to the drive at a specific path.',
        inputSchema: {
          type: 'object',
          properties: {
            imageName: {
              type: 'string',
              description: 'The name of the image (e.g., "design_mockup.png").',
            },
            base64Data: {
              type: 'string',
              description: 'The base64 encoded binary data of the image.',
            },
            contentType: {
              type: 'string',
              description: 'The mime-type of the image (e.g., "image/png", "image/jpeg"). Default is "image/png".',
            },
            parentPath: {
              type: 'string',
              description: 'The target directory path (e.g., "Projects/Campaigns"). Leave empty or pass "/" for root.',
            },
          },
          required: ['imageName', 'base64Data'],
        },
      },
    ],
  };
});

// Handle tools execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Make sure DB and MCP User are initialized
  if (!mcpUser) {
    await initDbAndUser();
  }

  try {
    if (name === 'list_contents') {
      const folderPath = args.folderPath || '/';
      let parentId;
      try {
        parentId = await resolvePath(folderPath, mcpUser._id);
      } catch (err) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: Path folder not found. ${err.message}` }],
        };
      }

      const folders = await Folder.find({ parent: parentId, owner: mcpUser._id }).sort({ name: 1 });
      const images = await Image.find({ parent: parentId, owner: mcpUser._id }).select('name size contentType createdAt').sort({ name: 1 });

      const folderList = [];
      for (const f of folders) {
        const size = await calculateFolderSize(f._id);
        folderList.push(`📁 ${f.name}/ (Size: ${formatBytes(size)})`);
      }

      const imageList = images.map(img => `🖼️ ${img.name} (${formatBytes(img.size)})`);

      const totalItems = folderList.length + imageList.length;
      let text = `Contents of '${folderPath}':\n\n`;
      if (totalItems === 0) {
        text += '(empty directory)';
      } else {
        text += [...folderList, ...imageList].join('\n');
      }

      return {
        content: [{ type: 'text', text }],
      };
    }

    if (name === 'create_folder') {
      const { folderName, parentPath } = args;
      let parentId;
      try {
        parentId = await resolvePath(parentPath || '/', mcpUser._id);
      } catch (err) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error resolving parent path: ${err.message}` }],
        };
      }

      // Check if folder exists
      const existing = await Folder.findOne({
        name: folderName.trim(),
        parent: parentId,
        owner: mcpUser._id,
      });

      if (existing) {
        return {
          content: [{ type: 'text', text: `Folder '${folderName}' already exists at path '${parentPath || '/'}'` }],
        };
      }

      const newFolder = await Folder.create({
        name: folderName.trim(),
        parent: parentId,
        owner: mcpUser._id,
      });

      return {
        content: [{ type: 'text', text: `Successfully created folder '${newFolder.name}' in '${parentPath || '/'}'` }],
      };
    }

    if (name === 'upload_image') {
      const { imageName, base64Data, contentType, parentPath } = args;
      let parentId;
      try {
        parentId = await resolvePath(parentPath || '/', mcpUser._id);
      } catch (err) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error resolving target path: ${err.message}` }],
        };
      }

      const mimeType = contentType || 'image/png';
      const buffer = Buffer.from(base64Data, 'base64');

      const newImage = await Image.create({
        name: imageName,
        data: buffer,
        contentType: mimeType,
        size: buffer.length,
        parent: parentId,
        owner: mcpUser._id,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully uploaded image '${newImage.name}' (${formatBytes(newImage.size)}) to '${parentPath || '/'}'`,
          },
        ],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Internal server error: ${error.message}` }],
    };
  }
});

// Run server using Stdio transport
const runServer = async () => {
  await initDbAndUser();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Dobby Drive MCP Server running on stdio');
};

runServer().catch(err => {
  console.error('MCP Server crash:', err);
  process.exit(1);
});
