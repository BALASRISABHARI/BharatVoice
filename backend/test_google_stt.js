// test_google_stt.js - Test Google Speech-to-Text
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎤 Google Speech-to-Text Test\n');

// 1. Check credentials
const credPath = path.join(__dirname, 'service-accountKey.json');
if (!fs.existsSync(credPath)) {
  console.log('❌ Credentials not found:', credPath);
  process.exit(1);
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
console.log('✅ Credentials set:', credPath);

// 2. Check audio file
const audioFile = path.join(__dirname, 'uploads', 'test_audio.wav');
if (!fs.existsSync(audioFile)) {
  console.log('❌ Audio file not found:', audioFile);
  console.log('\n🎤 Record audio first:');
  console.log('1. Start backend: node server.js');
  console.log('2. Use Flutter app to record');
  console.log('3. Say: "Testing speech recognition"');
  console.log('4. Send to backend');
  process.exit(1);
}

const fileSize = fs.statSync(audioFile).size;
console.log('✅ Audio file:', audioFile);
console.log('📦 Size:', fileSize, 'bytes');

// 3. Check if file is valid WAV
try {
  const buffer = fs.readFileSync(audioFile);
  const header = buffer.slice(0, 4).toString();
  console.log('🔍 File header:', `"${header}"`, header === 'RIFF' ? '✅' : '❌');
  
  if (header !== 'RIFF') {
    console.log('❌ Not a valid WAV file. File is corrupted.');
    console.log('🎤 Please record fresh audio.');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Cannot read file:', error.message);
  process.exit(1);
}

// 4. Test Google STT
console.log('\n📡 Testing Google Speech-to-Text API...');

try {
  // Import Google Speech library
  const speechModule = await import('@google-cloud/speech');
  const speech = speechModule.default || speechModule;
  const client = new speech.SpeechClient();
  
  console.log('✅ Google Speech client created');
  
  // Read and encode audio
  const audioBytes = fs.readFileSync(audioFile).toString('base64');
  const audio = { content: audioBytes };
  
  // Configuration matching your Flutter recording
  const config = {
    encoding: 'LINEAR16',      // WAV/PCM format
    sampleRateHertz: 16000,    // Your app records at 16kHz
    languageCode: 'en-US',     // English
    enableAutomaticPunctuation: true,
    model: 'command_and_search' // Good for voice commands
  };
  
  const request = { audio, config };
  
  console.log('\n🎯 Configuration:');
  console.log('   Format: WAV (LINEAR16)');
  console.log('   Sample rate: 16000 Hz');
  console.log('   Language: English (US)');
  console.log('   Model: Command and Search');
  
  console.log('\n⏳ Sending to Google... (may take 10-30 seconds)');
  
  // Make the API call
  const [response] = await client.recognize(request);
  
  console.log('\n✅ Google API responded!');
  
  if (response.results && response.results.length > 0) {
    const result = response.results[0];
    const alternative = result.alternatives[0];
    
    console.log('\n✅ ======== SUCCESS ========');
    console.log('📝 Transcript:', alternative.transcript);
    console.log('📊 Confidence:', alternative.confidence);
    console.log('✅ =========================');
    
    console.log('\n🎉 Google STT is WORKING!');
    console.log('Next: Integrate into your backend server.');
    
  } else {
    console.log('\n⚠️  No speech detected in audio.');
    console.log('   Possible reasons:');
    console.log('   1. Audio is silent/no speech');
    console.log('   2. Speech too quiet');
    console.log('   3. Background noise too loud');
    console.log('\n🎤 Try recording fresh audio saying:');
    console.log('   "Hello this is a speech recognition test"');
  }
  
} catch (error) {
  console.log('\n❌ Google STT Error:', error.message);
  
  // Common error solutions
  if (error.message.includes('billing') || error.message.includes('quota')) {
    console.log('\n💰 BILLING ISSUE:');
    console.log('1. Go to console.cloud.google.com');
    console.log('2. Go to Billing → Enable billing');
    console.log('3. Add payment method (free tier available)');
    console.log('4. Wait 5-10 minutes after enabling');
    
  } else if (error.message.includes('permission') || error.message.includes('403')) {
    console.log('\n🔐 PERMISSION ISSUE:');
    console.log('1. Go to IAM & Admin → IAM');
    console.log('2. Find service account:', fs.readFileSync(credPath, 'utf8').match(/"client_email": "([^"]+)"/)[1]);
    console.log('3. Add role: "Speech-to-Text User"');
    
  } else if (error.message.includes('API not enabled')) {
    console.log('\n🔧 API NOT ENABLED:');
    console.log('1. Go to APIs & Services → Library');
    console.log('2. Search "Speech-to-Text API"');
    console.log('3. Click ENABLE');
    
  } else if (error.message.includes('Invalid audio')) {
    console.log('\n🔊 AUDIO FORMAT ISSUE:');
    console.log('1. Audio file is corrupted');
    console.log('2. Record fresh audio with Flutter');
    console.log('3. Speak clearly into microphone');
    
  } else {
    console.log('\n🔧 UNKNOWN ERROR:');
    console.log('1. Check internet connection');
    console.log('2. Check if Google Cloud project is active');
    console.log('3. Try again in 5 minutes');
  }
}

console.log('\n🔚 Test completed.');