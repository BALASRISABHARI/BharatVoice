import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001; // Different port to test

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Simple multer config
const upload = multer({
  dest: 'test_uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  }
});

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Test server running' });
});

// Test upload with more logging
app.post('/voice', upload.single('audio'), (req, res) => {
  console.log('=== /voice endpoint called ===');
  console.log('Request body keys:', Object.keys(req.body));
  console.log('Request file:', req.file);
  console.log('File field name:', req.file?.fieldname);
  console.log('File original name:', req.file?.originalname);
  console.log('File size:', req.file?.size);
  console.log('File path:', req.file?.path);
  console.log('==============================');
  
  if (!req.file) {
    return res.status(400).json({ 
      error: 'No file received',
      receivedFields: Object.keys(req.body),
      receivedFiles: req.files || 'none'
    });
  }
  
  res.json({
    success: true,
    message: 'File received successfully!',
    file: {
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      fieldname: req.file.fieldname
    },
    transcript: 'This is a test transcript',
    reply: 'Test reply from server'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: err.message,
    stack: err.stack 
  });
});

app.listen(PORT, () => {
  console.log(`🔧 Test server running on http://localhost:${PORT}`);
  console.log(`Use this to debug your Flutter upload issues`);
});