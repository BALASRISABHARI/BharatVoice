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
const credPath = path.join(__dirname, "service-accountKey.json");
console.log(`🔑 Looking for credentials at: ${credPath}`);

if (!fs.existsSync(credPath)) {
  console.error("❌ CRITICAL: service-accountKey.json NOT FOUND!");
  console.error("   Download from: Firebase Console > Project Settings > Service Accounts");
  console.error("   Or continue with demo mode (no Firestore/Gemini)");
}

if (fs.existsSync(credPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
  console.log("✅ Google credentials loaded");
} else {
  console.log("⚠️  Running in DEMO MODE (no Firestore/Gemini integration)");
}

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/wav' || file.mimetype === 'audio/x-wav') {
      cb(null, true);
    } else {
      cb(new Error('Only WAV audio files are allowed'), false);
    }
  }
});

// ========== CORS MIDDLEWARE ==========
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, session-id");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ========== SMART LANGUAGE DETECTION ==========
function detectLanguageFromText(text) {
  if (!text || text.trim().length === 0) {
    return 'en';
  }
  
  const lowerText = text.toLowerCase().trim();
  console.log(`🔍 Detecting language for: "${text}"`);
  
  // 1. Check for TAMIL script
  if (/[\u0B80-\u0BFF]/.test(text)) {
    console.log("✅ Detected: TAMIL (script)");
    return 'ta';
  }
  
  // 2. Check for HINDI script
  if (/[\u0900-\u097F]/.test(text)) {
    console.log("✅ Detected: HINDI (script)");
    return 'hi';
  }
  
  // 3. Check for TAMIL transliterations
  const tamilWords = [
    'vanakkam', 'vannakkam', 'vanakam',
    'neram', 'enna', // FIXED: Added 'neram' here
    'udhavi', 'thogai', 'udhavithogai',
    'resan', 'reshan', 
    'aathar', 'athar',
    'oyyuthiyam', 'oyuthiyam',
    'நேரம்', 'உதவித்தொகை', 'ரேஷன்', 'ஆதார்', 'ஓய்வூதியம்' // FIXED: Added Tamil words
  ];
  
  for (const word of tamilWords) {
    if (lowerText.includes(word)) {
      console.log(`✅ Detected: TAMIL (word: "${word}")`);
      return 'ta';
    }
  }
  
  // 4. Check for HINDI transliterations
  const hindiWords = [
    'namaste', 'namaskar',
    'samay', 'समय',
    'chhatravritti', 'chhatra', 'छात्रवृत्ति',
    'rashan', 'राशन',
    'aadhar', 'आधार',
    'pension', 'पेंशन'
  ];
  
  for (const word of hindiWords) {
    if (lowerText.includes(word)) {
      console.log(`✅ Detected: HINDI (word: "${word}")`);
      return 'hi';
    }
  }
  
  // 5. Default to ENGLISH
  console.log("✅ Detected: ENGLISH (default)");
  return 'en';
}

// ========== SPEECH-TO-TEXT ==========
async function transcribeAudio(audioFilePath) {
  try {
    console.log("🎤 Transcribing audio...");
    
    // Check file
    if (!fs.existsSync(audioFilePath)) {
      throw new Error("Audio file not found");
    }
    
    const stats = fs.statSync(audioFilePath);
    console.log(`📊 File size: ${stats.size} bytes`);
    
    if (stats.size < 1000) {
      throw new Error("Audio file too small");
    }
    
    const speech = await import('@google-cloud/speech');
    const client = new speech.SpeechClient();
    
    const audioBytes = fs.readFileSync(audioFilePath).toString('base64');
    const audio = { content: audioBytes };
    
    // Try all three languages
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-IN',
      alternativeLanguageCodes: ['ta-IN', 'hi-IN'],
      enableAutomaticPunctuation: true,
    };
    
    console.log("📡 Sending to Google Cloud...");
    const [response] = await client.recognize({ audio, config });
    
    if (response.results && response.results.length > 0) {
      const transcript = response.results[0].alternatives[0].transcript.trim();
      const confidence = response.results[0].alternatives[0].confidence || 0;
      
      console.log(`✅ Transcription: "${transcript}" (confidence: ${confidence.toFixed(3)})`);
      
      // Detect language
      const language = detectLanguageFromText(transcript);
      console.log(`🌐 Language: ${language}`);
      
      return {
        success: true,
        transcript: transcript,
        confidence: confidence,
        language: language
      };
    } else {
      console.log("⚠️ No speech detected");
      return {
        success: true,
        transcript: "",
        confidence: 0,
        language: 'en'
      };
    }
    
  } catch (error) {
    console.log("❌ STT Error:", error.message);
    return {
      success: false,
      error: error.message,
      transcript: "",
      language: 'en'
    };
  }
}

// ========== TEXT-TO-SPEECH ==========
async function textToSpeech(text, language = 'en') {
  try {
    console.log(`🔊 Generating ${language} audio...`);
    
    const tts = await import('@google-cloud/text-to-speech');
    const client = new tts.TextToSpeechClient();
    
    const voiceConfig = {
      'ta': { languageCode: 'ta-IN', name: 'ta-IN-Standard-A' },
      'hi': { languageCode: 'hi-IN', name: 'hi-IN-Standard-A' },
      'en': { languageCode: 'en-IN', name: 'en-IN-Standard-A' }
    };
    
    const voice = voiceConfig[language] || voiceConfig['en'];
    
    const request = {
      input: { text },
      voice: voice,
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await client.synthesizeSpeech(request);
    
    return {
      success: true,
      audioContent: response.audioContent.toString('base64')
    };
    
  } catch (error) {
    console.log("❌ TTS Error:", error.message);
    return { success: false, error: error.message };
  }
}

// ========== RESPONSE GENERATOR ==========
function getMultiLanguageReply(transcript, language) {
  console.log(`💬 Generating ${language} reply...`);
  
  const lowerText = transcript.toLowerCase();
  
  // Responses in all three languages
  const responses = {
    'greeting': {
      'en': "Hello! I am BharatVoice. Ask me about time, scholarship, ration card, Aadhaar, or pension.",
      'ta': "வணக்கம்! நான் பாரத்வாய்ஸ். நேரம், உதவித்தொகை, ரேஷன் கார்டு, ஆதார் அல்லது ஓய்வூதியம் பற்றி கேளுங்கள்.",
      'hi': "नमस्ते! मैं भारतवॉयस हूं। समय, छात्रवृत्ति, राशन कार्ड, आधार या पेंशन के बारे में पूछें।"
    },
    'time': {
      'en': `Current time is ${new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}`,
      'ta': `தற்போது நேரம் ${new Date().toLocaleTimeString('ta-IN', {hour: '2-digit', minute:'2-digit'})}`,
      'hi': `वर्तमान समय ${new Date().toLocaleTimeString('hi-IN', {hour: '2-digit', minute:'2-digit'})} है`
    },
    'scholarship': {
      'en': "For scholarship, visit nsp.gov.in or contact your school.",
      'ta': "உதவித்தொகைக்கு, nsp.gov.in செல்லவும் அல்லது உங்கள் பள்ளியை தொடர்பு கொள்ளவும்.",
      'hi': "छात्रवृत्ति के लिए, nsp.gov.in पर जाएं या अपने स्कूल से संपर्क करें।"
    },
    'ration': {
      'en': "For ration card, visit your local ration office with ID proof.",
      'ta': "ரேஷன் கார்டுக்கு, அடையாள சான்றுடன் உங்கள் உள்ளூர் ரேஷன் அலுவலகம் செல்லவும்.",
      'hi': "राशन कार्ड के लिए, पहचान प्रमाण के साथ अपने स्थानीय राशन कार्यालय में जाएं।"
    },
    'aadhaar': {
      'en': "For Aadhaar, visit uidai.gov.in or nearest enrollment center.",
      'ta': "ஆதாருக்கு, uidai.gov.in அல்லது அருகிலுள்ள பதிவு மையம் செல்லவும்.",
      'hi': "आधार के लिए, uidai.gov.in पर जाएं या निकटतम नामांकन केंद्र पर जाएं।"
    },
    'pension': {
      'en': "For pension, contact your bank or visit npci.org.in",
      'ta': "ஓய்வூதியத்திற்கு, உங்கள் வங்கியை தொடர்பு கொள்ளவும் அல்லது npci.org.in செல்லவும்.",
      'hi': "पेंशन के लिए, अपने बैंक से संपर्क करें या npci.org.in पर जाएं।"
    }
  };
  
  // Detect intent - FIXED VERSION with better matching
  let intent = 'greeting';
  
  // FIXED: Added comprehensive matching for all languages
  const timeKeywords = ['time', 'நேரம்', 'समय', 'neram', 'samay'];
  const scholarshipKeywords = ['scholarship', 'உதவித்தொகை', 'छात्रवृत्ति', 'udhavithogai', 'chhatravritti'];
  const rationKeywords = ['ration', 'ரேஷன்', 'राशन', 'resan', 'rashan'];
  const aadhaarKeywords = ['aadhaar', 'aadhar', 'ஆதார்', 'आधार', 'athar'];
  const pensionKeywords = ['pension', 'ஓய்வூதியம்', 'पेंशन', 'oyyuthiyam'];
  const greetingKeywords = ['hello', 'hi', 'vanakkam', 'namaste', 'வணக்கம்', 'नमस्ते'];
  
  if (timeKeywords.some(keyword => lowerText.includes(keyword))) {
    console.log("⏰ Detected TIME intent");
    intent = 'time';
  } else if (scholarshipKeywords.some(keyword => lowerText.includes(keyword))) {
    console.log("🎓 Detected SCHOLARSHIP intent");
    intent = 'scholarship';
  } else if (rationKeywords.some(keyword => lowerText.includes(keyword))) {
    console.log("🛒 Detected RATION intent");
    intent = 'ration';
  } else if (aadhaarKeywords.some(keyword => lowerText.includes(keyword))) {
    console.log("🪪 Detected AADHAAR intent");
    intent = 'aadhaar';
  } else if (pensionKeywords.some(keyword => lowerText.includes(keyword))) {
    console.log("👵 Detected PENSION intent");
    intent = 'pension';
  } else if (greetingKeywords.some(keyword => lowerText.includes(keyword))) {
    console.log("👋 Detected GREETING intent");
    intent = 'greeting';
  }
  
  console.log(`🎯 Intent: ${intent}`);
  
  const reply = responses[intent][language];
  
  return {
    reply: reply,
    language: language,
    intent: intent
  };
}

// ========== MAIN ENDPOINT ==========
app.post("/voice", upload.single("audio"), async (req, res) => {
  console.log("\n" + "=".repeat(40));
  console.log("🎤 VOICE REQUEST");
  console.log("=".repeat(40));
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file" });
    }

    const sessionId = req.headers['session-id'] || generateSessionId();
    console.log("📱 Session:", sessionId);
    
    // 1. Transcribe audio
    const sttResult = await transcribeAudio(req.file.path);
    
    // Clean up file
    fs.unlink(req.file.path, () => {});
    
    if (!sttResult.success) {
      return res.json({
        success: false,
        transcript: "",
        reply: "Sorry, I couldn't process the audio. Please try again.",
        hasAudio: false,
        sessionId: sessionId
      });
    }
    
    // 2. Generate reply in detected language
    const replyResult = getMultiLanguageReply(sttResult.transcript, sttResult.language);
    
    // 3. Generate audio in same language
    const ttsResult = await textToSpeech(replyResult.reply, sttResult.language);
    
    // 4. Return response
    return res.json({
      success: true,
      transcript: sttResult.transcript,
      reply: replyResult.reply,
      language: sttResult.language,
      intent: replyResult.intent,
      hasAudio: ttsResult.success,
      audioContent: ttsResult.success ? ttsResult.audioContent : null,
      sessionId: sessionId,
      confidence: sttResult.confidence,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("❌ Error:", err.message);
    return res.status(500).json({ 
      success: false,
      error: "Server error",
      transcript: "",
      reply: "Sorry, something went wrong. Please try again."
    });
  }
});

// ========== HEALTH CHECK ==========
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "BharatVoice",
    timestamp: new Date().toISOString(),
    endpoints: {
      voice: "POST /voice"
    }
  });
});

// ========== START SERVER ==========
app.listen(PORT, "0.0.0.0", () => {
  console.log("\n" + "✅".repeat(30));
  console.log("✅   BHARATVOICE - WORKING   ✅");
  console.log("✅".repeat(30));
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📍 Emulator: http://10.0.2.2:${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log("\n🎯 SUPPORTED INTENTS:");
  console.log("   • Greeting (hello, hi, vanakkam, namaste)");
  console.log("   • Time query (time, neram, samay)");
  console.log("   • Scholarship status");
  console.log("   • Ration card information");
  console.log("   • Aadhaar card services");
  console.log("   • Pension information");
  console.log("\n🌐 LANGUAGES: English, தமிழ் (Tamil), हिंदी (Hindi)");
  console.log("\n🚀 Server ready! Waiting for voice requests...");
  console.log("=".repeat(40));
});