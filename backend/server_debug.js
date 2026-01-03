import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 1. Enable CORS with more permissions
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Handle preflight requests
app.options('*', cors());

// 3. Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Content-Length:', req.headers['content-length']);
  next();
});

// 4. Create uploads directory if not exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// 5. Configure Multer with more details
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `audio_${Date.now()}_${file.originalname || 'file'}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter called');
    console.log('File fieldname:', file.fieldname);
    console.log('File originalname:', file.originalname);
    console.log('File mimetype:', file.mimetype);
    
    // Accept all files for debugging
    cb(null, true);
  }
});

// 6. Test route
app.get("/", (req, res) => {
  res.json({ 
    status: "Backend OK",
    endpoints: {
      voice: "POST /voice (multipart/form-data with 'audio' field)"
    }
  });
});

// 7. Voice route with EXTRA debugging
app.post("/voice", upload.single("audio"), async (req, res) => {
  try {
    console.log("=".repeat(50));
    console.log("📥 /voice endpoint HIT - POST");
    
    // Log everything about the request
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Request file:", req.file ? "EXISTS" : "NULL/UNDEFINED");
    
    if (req.file) {
      console.log("📁 File details:");
      console.log("- Field name:", req.file.fieldname);
      console.log("- Original name:", req.file.originalname);
      console.log("- MIME type:", req.file.mimetype);
      console.log("- Size:", req.file.size, "bytes");
      console.log("- Path:", req.file.path);
      console.log("- Destination:", req.file.destination);
      console.log("- Filename:", req.file.filename);
    } else {
      console.log("❌ No file in req.file");
      console.log("❌ Request headers:", req.headers);
      console.log("❌ Request body type:", typeof req.body);
      console.log("❌ Request body length:", req.body.length || 'unknown');
    }
    console.log("=".repeat(50));

    if (!req.file) {
      return res.status(400).json({ 
        error: "No audio file received",
        details: {
          contentType: req.headers['content-type'],
          contentLength: req.headers['content-length'],
          receivedFields: Object.keys(req.body)
        }
      });
    }

    // 8. TEMPORARY RESPONSE
    return res.status(200).json({
      transcript: "DEBUG: File received successfully!",
      reply: `File: ${req.file.originalname || 'unnamed'}, Size: ${req.file.size} bytes`,
      fileInfo: {
        fieldname: req.file.fieldname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    console.error("❌ Error stack:", err.stack);
    return res.status(500).json({ 
      error: "Server error",
      message: err.message,
      stack: err.stack 
    });
  }
});

// 9. Add error handling for Multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer Error:', err);
    return res.status(400).json({
      error: 'File upload error',
      multerError: err.code,
      message: err.message
    });
  }
  next(err);
});

// 10. Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 DEBUG Backend running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Local: http://localhost:${PORT}`);
  console.log(`🌐 Use in Flutter: http://10.0.2.2:${PORT} (emulator) or your computer IP`);
  console.log(`📝 Endpoint: POST http://localhost:${PORT}/voice`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});