// server_with_stt_final.js - Simple backend with Google STT
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// ========== SETUP ==========
// Set Google credentials
const credPath = path.join(__dirname, "service-accountKey.json");
process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;

// Configure multer
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ========== GOOGLE STT FUNCTION ==========
async function transcribeAudio(audioFilePath) {
  try {
    console.log("🎤 Converting speech to text...");
    
    const speechModule = await import('@google-cloud/speech');
    const speech = speechModule.default || speechModule;
    const client = new speech.SpeechClient();
    
    const audioBytes = fs.readFileSync(audioFilePath).toString('base64');
    const audio = { content: audioBytes };
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    };
    
    console.log("⏳ Sending to Google STT...");
    const [response] = await client.recognize({ audio, config });
    
    if (response.results && response.results.length > 0) {
      const transcript = response.results[0].alternatives[0].transcript;
      const confidence = response.results[0].alternatives[0].confidence || 0;
      
      console.log("✅ Transcription:", transcript);
      console.log("📊 Confidence:", confidence);
      
      return { success: true, transcript, confidence };
    } else {
      console.log("⚠️  No speech detected");
      return { success: true, transcript: "", confidence: 0 };
    }
    
  } catch (error) {
    console.log("❌ STT Error:", error.message);
    return { success: false, error: error.message };
  }
}

// ========== SIMPLE RESPONSE LOGIC ==========
function getSimpleReply(transcript) {
  const lower = transcript.toLowerCase();
  
  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hello! I'm BharatVoice. How can I help you?";
  }
  else if (lower.includes("name")) {
    return "I'm BharatVoice, your voice assistant for public information.";
  }
  else if (lower.includes("time")) {
    return `The time is ${new Date().toLocaleTimeString()}.`;
  }
  else if (lower.includes("date")) {
    return `Today is ${new Date().toLocaleDateString()}.`;
  }
  else if (lower.includes("thank")) {
    return "You're welcome!";
  }
  else if (lower.includes("scholarship")) {
    return "For scholarship information, visit the National Scholarship Portal.";
  }
  else if (lower.includes("ration")) {
    return "For ration card information, visit your local ration office.";
  }
  else if (lower.includes("aadhaar")) {
    return "For Aadhaar updates, visit uidai.gov.in.";
  }
  else {
    return `I heard: "${transcript}". I can help with scholarship, ration card, or Aadhaar information.`;
  }
}

// ========== ROUTES ==========
app.get("/", (req, res) => {
  res.json({ 
    status: "BharatVoice Backend with Google STT",
    message: "Voice endpoint: POST /voice",
    features: ["Google Speech-to-Text", "Voice responses"],
    available_topics: ["scholarship", "ration card", "aadhaar", "time", "date"]
  });
});

// MAIN VOICE ENDPOINT
app.post("/voice", upload.single("audio"), async (req, res) => {
  console.log("\n📥 Received voice request");
  
  try {
    if (!req.file) {
      console.log("❌ No audio file");
      return res.status(400).json({ error: "No audio file" });
    }

    console.log(`📁 File: ${req.file.filename} (${req.file.size} bytes)`);

    // 1. Transcribe audio
    const sttResult = await transcribeAudio(req.file.path);
    
    // Clean up file
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    
    if (!sttResult.success) {
      console.log("❌ STT failed");
      return res.json({
        transcript: "Audio processing failed",
        reply: "Sorry, I couldn't process your voice. Please try again.",
        error: sttResult.error
      });
    }

    if (!sttResult.transcript || sttResult.transcript.trim() === "") {
      console.log("⚠️  No speech detected");
      return res.json({
        transcript: "(No speech detected)",
        reply: "I didn't hear anything. Please speak clearly.",
        confidence: 0
      });
    }

    // 2. Generate reply
    const reply = getSimpleReply(sttResult.transcript);
    
    console.log("✅ Query:", sttResult.transcript);
    console.log("💬 Reply:", reply);

    // 3. Return response
    return res.json({
      transcript: sttResult.transcript,
      reply: reply,
      confidence: sttResult.confidence,
      features: "Google STT Active"
    });

  } catch (err) {
    console.error("❌ Server Error:", err);
    return res.status(500).json({ 
      error: "Server error",
      message: err.message 
    });
  }
});

// ========== START SERVER ==========
app.listen(PORT, "0.0.0.0", () => {
  console.log("\n" + "🚀".repeat(30));
  console.log("🚀 BHARATVOICE WITH GOOGLE STT");
  console.log("🚀".repeat(30));
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📡 Network: http://172.20.160.92:${PORT}`);
  console.log(`🎤 Google Speech-to-Text: ✅ ACTIVE`);
  console.log("🎯 Try saying: 'scholarship', 'ration card', or 'hello'");
  console.log("=".repeat(50) + "\n");
});