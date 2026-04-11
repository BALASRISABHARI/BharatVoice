import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import usersDataset from "./usersDataset.js";

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

// ========== MIDDLEWARE ==========
app.use(express.json());
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

// Dataset is now imported from usersDataset.js

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
  
  // 1b. Check for TELUGU script
  if (/[\u0C00-\u0C7F]/.test(text)) {
    console.log("✅ Detected: TELUGU (script)");
    return 'te';
  }
  
  // 2. Check for HINDI script (also covers Marathi, so we distinguish by words)
  if (/[\u0900-\u097F]/.test(text)) {
    // If it contains Marathi-specific words, classify as Marathi
    const marathiWords = ['मी', 'माझ्या', 'माझी', 'तुला', 'काय', 'कशी', 'मदत', 'करू', 'शिष्यवृत्ती', 'वेळ', 'पासपोर्ट', 'रेशन', 'पेन्शन', 'तपशील'];
    if (marathiWords.some(word => lowerText.includes(word.toLowerCase()))) {
      console.log("✅ Detected: MARATHI (script + word)");
      return 'mr';
    }
    console.log("✅ Detected: HINDI (script)");
    return 'hi';
  }
  
  // 3. Check for TAMIL transliterations
  const tamilWords = [
    'vanakkam', 'vannakkam', 'vanakam',
    'neram', 'enna', 
    'udhavi', 'thogai', 'udhavithogai',
    'resan', 'reshan', 
    'aathar', 'athar',
    'oyyuthiyam', 'oyuthiyam',
    'நேரம்', 'உதவித்தொகை', 'ரேஷன்', 'ஆதார்', 'ஓய்வூதியம்'
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
    'आधार',
    'पेंशन'
  ];
  
  for (const word of hindiWords) {
    if (lowerText.includes(word)) {
      console.log(`✅ Detected: HINDI (word: "${word}")`);
      return 'hi';
    }
  }

  // 4b. Check for TELUGU transliterations
  const teluguWords = [
    'namaskaram', 'namaskaramu',
    'samayam', 'yentha'
  ];
  
  for (const word of teluguWords) {
    if (lowerText.includes(word)) {
      console.log(`✅ Detected: TELUGU (word: "${word}")`);
      return 'te';
    }
  }

  // 4c. Check for MARATHI transliterations
  const marathiTranslitWords = [
    'namaskar', 'vel',
    'shishyavrutti'
  ];
  
  for (const word of marathiTranslitWords) {
    if (lowerText.includes(word)) {
      console.log(`✅ Detected: MARATHI (word: "${word}")`);
      return 'mr';
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
    
    // Try languages
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-IN',
      alternativeLanguageCodes: ['ta-IN', 'hi-IN', 'te-IN', 'mr-IN'],
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
      'te': { languageCode: 'te-IN', name: 'te-IN-Standard-A' },
      'mr': { languageCode: 'mr-IN', name: 'mr-IN-Standard-A' },
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
  
  // Responses in all supported languages
  const responses = {
    'greeting': {
      'en': "Hello! I am BharatVoice. Ask me about time, scholarship, ration card, Aadhaar, pension, or passport.",
      'ta': "வணக்கம்! நான் பாரத்வாய்ஸ். நேரம், உதவித்தொகை, ரேஷன் கார்டு, ஆதார், ஓய்வூதியம், அல்லது பாஸ்போர்ட் பற்றி கேளுங்கள்.",
      'hi': "नमस्ते! मैं भारतवॉयस हूं। समय, छात्रवृत्ति, राशन कार्ड, आधार, पेंशन या पासपोर्ट के बारे में पूछें।",
      'te': "నమస్కారం! నేను భారత్‌వాయిస్. మీరు సమయం, స్కాలర్‌షిప్, రేషన్ కార్డు, ఆధార్, పెన్షన్ లేదా పాస్‌పోర్ట్ గురించి అడగవచ్చు.",
      'mr': "नमस्कार! मी भारतव्हॉइस आहे. वेळ, शिष्यवृत्ती, रेशन कार्ड, आधार, पेन्शन किंवा पासपोर्ट बद्दल विचारा."
    },
    'time': {
      'en': `Current time is ${new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}`,
      'ta': `தற்போது நேரம் ${new Date().toLocaleTimeString('ta-IN', {hour: '2-digit', minute:'2-digit'})}`,
      'hi': `वर्तमान समय ${new Date().toLocaleTimeString('hi-IN', {hour: '2-digit', minute:'2-digit'})} है`,
      'te': `ప్రస్తుత సమయం ${new Date().toLocaleTimeString('te-IN', {hour: '2-digit', minute:'2-digit'})}`,
      'mr': `सध्याची वेळ ${new Date().toLocaleTimeString('mr-IN', {hour: '2-digit', minute:'2-digit'})} आहे`
    },
    'scholarship': {
      'en': "For scholarship, visit nsp.gov.in or contact your school.",
      'ta': "உதவித்தொகைக்கு, nsp.gov.in செல்லவும் அல்லது உங்கள் பள்ளியை தொடர்பு கொள்ளவும்.",
      'hi': "छात्रवृत्ति के लिए, nsp.gov.in पर जाएं या अपने स्कूल से संपर्क करें।",
      'te': "స్కాలర్‌షిప్ కోసం, nsp.gov.in కి వెళ్లండి లేదా మీ పాఠశాలను సంప్రదించండి.",
      'mr': "शिष्यवृत्तीसाठी, nsp.gov.in ला भेट द्या किंवा तुमच्या शाळेशी संपर्क साधा."
    },
    'ration': {
      'en': "Please enter your ID to check your ration card status.",
      'ta': "உங்கள் ரேஷன் கார்டு நிலையை சரிபார்க்க உங்கள் ID-ஐ உள்ளிடவும்.",
      'hi': "अपना राशन कार्ड स्टेटस चेक करने के लिए कृपया अपनी आईडी दर्ज करें।",
      'te': "మీ రేషన్ కార్డ్ స్థితిని తనిఖీ చేయడానికి దయచేసి మీ IDని నమోదు చేయండి.",
      'mr': "तुमचे रेशन कार्ड स्टेटस तपासण्यासाठी कृपया तुमचा आयडी नोंदवा."
    },
    'aadhaar': {
      'en': "Please enter your ID to check your Aadhaar status.",
      'ta': "உங்கள் ஆதார் நிலையை சரிபார்க்க உங்கள் ID-ஐ உள்ளிடவும்.",
      'hi': "अपना आधार स्टेटस चेक करने के लिए कृपया अपनी आईडी दर्ज करें।",
      'te': "మీ ఆధార్ స్థితిని తనిఖీ చేయడానికి దయచేసి మీ IDని నమోదు చేయండి.",
      'mr': "तुमचे आधार स्टेटस तपासण्यासाठी कृपया तुमचा आयडी नोंदवा."
    },
    'pension': {
      'en': "Please enter your ID to check your pension status.",
      'ta': "உங்கள் ஓய்வூதிய நிலையை சரிபார்க்க உங்கள் ID-ஐ உள்ளிடவும்.",
      'hi': "अपना पेंशन स्टेटस चेक करने के लिए कृपया अपनी आईडी दर्ज करें।",
      'te': "మీ పెన్షన్ స్థితిని తనిఖీ చేయడానికి దయచేసి మీ IDని నమోదు చేయండి.",
      'mr': "तुमचे पेन्शन स्टेटस तपासण्यासाठी कृपया तुमचा आयडी नोंदवा."
    },
    'passport': {
      'en': "Please enter your ID to check your passport status.",
      'ta': "உங்கள் பாஸ்போர்ட் நிலையை சரிபார்க்க உங்கள் ID-ஐ உள்ளிடவும்.",
      'hi': "अपना पासपोर्ट स्टेटस चेक करने के लिए कृपया अपनी आईडी दर्ज करें।",
      'te': "మీ పాస్ పోర్ట్ స్థితిని తనిఖీ చేయడానికి దయచేసి మీ IDని నమోదు చేయండి.",
      'mr': "तुमचे पासपोर्ट स्टेटस तपासण्यासाठी कृपया तुमचा आयडी नोंदवा."
    }
  };
  
  // Detect intent
  let intent = 'greeting';
  
  const timeKeywords = ['time', 'நேரம்', 'समय', 'neram', 'samay', 'samayam', 'vel', 'वेळ'];
  const scholarshipKeywords = ['scholarship', 'உதவித்தொகை', 'छात्रवृत्ति', 'udhavithogai', 'chhatravritti', 'shishyavrutti', 'शिष्यवृत्ती'];
  const rationKeywords = ['ration', 'ரேஷன்', 'राशन', 'resan', 'rashan', 'రేషన్', 'रेशन'];
  const aadhaarKeywords = ['aadhaar', 'aadhar', 'ஆதார்', 'आधार', 'athar', 'ఆధార్'];
  const pensionKeywords = ['pension', 'ஓய்வூதியம்', 'पेंशन', 'oyyuthiyam', 'పెన్షన్', 'पेन्शन'];
  const passportKeywords = ['passport', 'ಪಾಸ್ಪೋರ್ಟ್', 'பாஸ்போர்ட்', 'पासपोर्ट', 'పాస్‌పోర్ట్'];
  const greetingKeywords = ['hello', 'hi', 'vanakkam', 'namaste', 'வணக்கம்', 'नमस्ते', 'namaskaram', 'namaskar'];
  
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
  } else if (passportKeywords.some(keyword => lowerText.includes(keyword))) {
    console.log("✈️ Detected PASSPORT intent");
    intent = 'passport';
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

// ========== TEXT QUERY ENDPOINT ==========
app.post("/query", async (req, res) => {
  console.log("\n" + "=".repeat(40));
  console.log("💬 TEXT QUERY REQUEST");
  console.log("=".repeat(40));
  
  try {
    const text = req.body.text;
    if (!text) {
      return res.status(400).json({ error: "No text provided in request body." });
    }

    const sessionId = req.headers['session-id'] || generateSessionId();
    console.log("📱 Session:", sessionId);
    console.log(`📝 Query Text: "${text}"`);
    
    // 1. Detect language from text
    let language = detectLanguageFromText(text);
    // Adjust language if Telugu/Marathi specific since STT mapped it previously.
    // getMultiLanguageReply will use it anyway.
    
    // 2. Generate reply in detected language
    const replyResult = getMultiLanguageReply(text, language);
    
    // 3. Generate audio in same language
    const ttsResult = await textToSpeech(replyResult.reply, language);
    
    // 4. Return response
    return res.json({
      success: true,
      transcript: text,
      reply: replyResult.reply,
      language: language,
      intent: replyResult.intent,
      hasAudio: ttsResult.success,
      audioContent: ttsResult.success ? ttsResult.audioContent : null,
      sessionId: sessionId,
      confidence: 1.0,
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

// ========== STATUS TRACKING ENDPOINT ==========
app.post("/get-status", async (req, res) => {
  try {
    const { id, service, language } = req.body;
    if (!id || !service) {
      return res.status(400).json({ error: "Missing id or service parameters." });
    }
    
    const lang = language || 'en';
    console.log(`\n🔍 STATUS CHECK: ID="${id}", Service="${service}", Lang="${lang}"`);
    
    let user = usersDataset.find(u => u.id.toLowerCase() === id.toLowerCase());
    
    let statusValue = "Not Found";
    let message = "";
    
    const statusTranslations = {
      "Verified": { "ta": "சரிபார்க்கப்பட்டது", "hi": "सत्यापित", "te": "ధృవీకరించబడింది", "mr": "सत्यापित", "en": "Verified" },
      "Pending": { "ta": "நிலுவையில் உள்ளது", "hi": "लंबित", "te": "పెండింగ్‌లో ఉంది", "mr": "प्रलंबित", "en": "Pending" },
      "Rejected": { "ta": "நிராகரிக்கப்பட்டது", "hi": "अस्वीकृत", "te": "తిరస్కరించబడింది", "mr": "नाकारले", "en": "Rejected" },
      "Approved": { "ta": "ஒப்புதல் அளிக்கப்பட்டது", "hi": "स्वीकृत", "te": "ఆమోదించబడింది", "mr": "मंजूर", "en": "Approved" }
    };
    
    const serviceTranslations = {
      "passport": { "ta": "பாஸ்போர்ட்", "hi": "पासपोर्ट", "te": "పాస్‌పోర్ట్", "mr": "पासपोर्ट", "en": "passport" },
      "aadhaar": { "ta": "ஆதார்", "hi": "आधार", "te": "ఆధార్", "mr": "आधार", "en": "Aadhaar" },
      "ration": { "ta": "ரேஷன்கார்டு", "hi": "राशन कार्ड", "te": "రేషన్ కార్డ్", "mr": "रेशन कार्ड", "en": "ration card" },
      "pension": { "ta": "ஓய்வூதிய", "hi": "पेंशन", "te": "పెన్షన్", "mr": "पेन्शन", "en": "pension" }
    };

    if (user) {
      statusValue = user[`${service}_status`];
      if (statusValue) {
        const translatedStatus = statusTranslations[statusValue]?.[lang] || statusValue;
        const translatedService = serviceTranslations[service]?.[lang] || service;
        
        const templates = {
          'en': `Your ${translatedService} status is ${translatedStatus}.`,
          'ta': `உங்கள் ${translatedService} நிலை ${translatedStatus}.`,
          'hi': `आपका ${translatedService} स्टेटस ${translatedStatus} है।`,
          'te': `మీ ${translatedService} స్థితి ${translatedStatus}.`,
          'mr': `तुमचे ${translatedService} स्टेटस ${translatedStatus} आहे.`
        };
        message = templates[lang] || templates['en'];
      } else {
        message = `No status found for service ${service}.`;
      }
    } else {
      const notFoundTemplates = {
        'en': `No record found for ID ${id}.`,
        'ta': `ID ${id} க்கு எந்த பதிவும் காணப்படவில்லை.`,
        'hi': `ID ${id} के लिए कोई रिकॉर्ड नहीं मिला।`,
        'te': `ID ${id} కోసం రికార్డు కనుగొనబడలేదు.`,
        'mr': `ID ${id} साठी कोणतीही नोंद आढळली नाही.`
      };
      message = notFoundTemplates[lang] || notFoundTemplates['en'];
    }
    
    // Generate voice response for the frontend to play
    console.log(`💬 Response: "${message}"`);
    const ttsResult = await textToSpeech(message, lang);
    
    return res.json({
      status: statusValue,
      message: message,
      hasAudio: ttsResult.success,
      audioContent: ttsResult.success ? ttsResult.audioContent : null
    });
    
  } catch (err) {
    console.error("❌ Error:", err.message);
    return res.status(500).json({ error: err.message });
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
  console.log("   • Greeting (hello, hi, vanakkam, namaste, namaskaram)");
  console.log("   • Time query (time, neram, samay, samayam, vel)");
  console.log("   • Scholarship status");
  console.log("   • Ration card information");
  console.log("   • Aadhaar card services");
  console.log("   • Pension information");
  console.log("   • Passport status");
  console.log("\n🌐 LANGUAGES: English, தமிழ் (Tamil), हिंदी (Hindi), తెలుగు (Telugu), मराठी (Marathi)");
  console.log("\n🚀 Server ready! Waiting for voice requests...");
  console.log("=".repeat(40));
});