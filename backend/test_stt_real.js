// test_stt_real.js - Test STT with actual audio file
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

console.log('🎤 Testing Google Speech-to-Text with REAL audio...\n');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Set credentials
const credPath = join(__dirname, 'service-accountKey.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
console.log('✅ Credentials set:', credPath);

// 2. Find an audio file to test
const uploadsDir = join(__dirname, 'uploads');
let audioFiles = [];

if (fs.existsSync(uploadsDir)) {
  audioFiles = fs.readdirSync(uploadsDir)
    .filter(file => file.endsWith('.wav') || file.endsWith('.WAV'));
}

if (audioFiles.length === 0) {
  console.log('❌ No audio files found in uploads folder');
  console.log('\n🎤 Please record audio from Flutter app first');
  console.log('1. Run Flutter app');
  console.log('2. Record some audio (say "hello testing")');
  console.log('3. Send to backend');
  console.log('4. Check uploads folder for WAV files');
  process.exit(1);
}

console.log(`✅ Found ${audioFiles.length} audio files:`);
audioFiles.forEach((file, i) => {
  console.log(`   ${i + 1}. ${file} (${Math.round(fs.statSync(join(uploadsDir, file)).size / 1024)} KB)`);
});

// ... find this part in the file and change it:

// 3. Use the LARGEST audio file (not the first)
const audioFilesWithSize = audioFiles.map(file => {
  const filePath = join(uploadsDir, file);
  return {
    name: file,
    path: filePath,
    size: fs.statSync(filePath).size
  };
});

// Sort by size (largest first)
audioFilesWithSize.sort((a, b) => b.size - a.size);

console.log(`✅ Found ${audioFilesWithSize.length} audio files (sorted by size):`);
audioFilesWithSize.forEach((file, i) => {
  console.log(`   ${i + 1}. ${file.name} (${Math.round(file.size / 1024)} KB)`);
});

// Use the largest file
const testAudioFile = audioFilesWithSize[0].path;
console.log('\n🔊 Using LARGEST audio file:', testAudioFile);
console.log(`   Size: ${Math.round(audioFilesWithSize[0].size / 1024)} KB`);

// 4. Read audio file
try {
  const audioBytes = fs.readFileSync(testAudioFile).toString('base64');
  console.log(`✅ Audio loaded: ${audioBytes.length} bytes (base64)`);
  
  // 5. Import and use Google Speech
  console.log('\n📡 Connecting to Google Speech-to-Text API...');
  
  // Dynamic import
  const speechModule = await import('@google-cloud/speech');
  const speech = speechModule.default || speechModule;
  const client = new speech.SpeechClient();
  
  console.log('✅ Google Speech client created');
  
  // 6. Configure STT request
  const audio = {
    content: audioBytes,
  };
  
  const config = {
    encoding: 'LINEAR16',  // WAV/PCM format
    sampleRateHertz: 16000, // Your app records at 16kHz
    languageCode: 'en-US',
    enableAutomaticPunctuation: true,
    model: 'command_and_search', // Good for voice commands
  };
  
  const request = {
    audio: audio,
    config: config,
  };
  
  console.log('\n🎯 Sending to Google STT:');
  console.log('   Format: WAV (LINEAR16)');
  console.log('   Sample rate: 16000 Hz');
  console.log('   Language: English (US)');
  console.log('   Model: Command and Search');
  console.log('\n⏳ Processing... (this may take 10-20 seconds)');
  
  // 7. Call Google STT API
  const [response] = await client.recognize(request);
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
  
  console.log('\n✅ ======== RESULTS ========');
  console.log('📝 TRANSCRIPTION:', transcription);
  console.log('📊 Confidence:', response.results[0]?.alternatives[0]?.confidence || 'N/A');
  console.log('✅ ==========================\n');
  
  if (transcription) {
    console.log('🎉 SUCCESS! Google STT is working!');
  } else {
    console.log('⚠️  No transcription returned. Try speaking louder/more clearly.');
  }
  
} catch (error) {
  console.log('❌ ERROR:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Check if billing is enabled on Google Cloud');
  console.log('2. Check internet connection');
  console.log('3. Make sure Speech-to-Text API is enabled');
  console.log('4. Try a different audio file');
}