🇮🇳 BharatVoice - Multilingual Voice Assistant
https://img.shields.io/badge/Flutter-3.x-blue.svg
https://img.shields.io/badge/Node.js-18.x-green.svg
https://img.shields.io/badge/Google%2520Cloud-Speech%2520%257C%2520TTS-orange.svg

BharatVoice is an AI-powered multilingual voice assistant application that enables users to access government service information through natural voice conversations in English, Hindi, and Tamil. The app automatically detects the user's spoken language and responds in the same language, making digital information accessible to diverse linguistic populations.

✨ Features
🎤 Voice-based Interface - Push-to-talk voice interaction

🌐 Automatic Language Detection - Supports English, Hindi, and Tamil

🤖 AI-Powered Responses - Intelligent intent detection for government services

🔊 Text-to-Speech - Voice responses in detected language

💬 Chat History - View conversation history with timestamps

🔄 Multi-language Switching - Switch languages mid-conversation seamlessly

Supported Queries
⏰ Time - Current time information

🎓 Scholarship - Scholarship application guidance

🛒 Ration Card - Ration card information

🪪 Aadhaar - Aadhaar card services

👵 Pension - Pension scheme details

🏗️ Architecture
text
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Flutter   │────▶│  Node.js     │────▶│  Google Cloud  │
│    Frontend │◀────│   Backend    │◀────│    APIs        │
└─────────────┘     └──────────────┘     └─────────────────┘
🚀 Tech Stack
Frontend
Flutter - Cross-platform mobile framework

record - Audio recording

audioplayers - Audio playback

http - API communication

Backend
Node.js - Runtime environment

Express - Web framework

Multer - File upload handling

Google Cloud Services
Speech-to-Text API - Voice transcription

Text-to-Speech API - Voice synthesis

Google AI Studio - Language processing

📋 Prerequisites
Flutter SDK (3.x)

Node.js (18.x)

Google Cloud account with APIs enabled

Service account key for Google Cloud

🔧 Installation
1. Clone the Repository
bash
git clone https://github.com/yourusername/bharatvoice.git
cd bharatvoice
2. Backend Setup
bash
cd backend
npm install

# Add your Google Cloud service account key
# Place service-accountKey.json in backend folder
3. Frontend Setup
bash
cd frontend
flutter pub get
4. Configuration
Backend (.env)
env
PORT=3000
GOOGLE_APPLICATION_CREDENTIALS=./service-accountKey.json
Frontend (Update IP in main.dart)
dart
final uri = Uri.parse('http://YOUR_IP_ADDRESS:3000/voice');
🎯 Usage
Start Backend Server
bash
cd backend
node server.js
Run Flutter App
bash
cd frontend
flutter run
Using the App
Tap the microphone button

Speak your query in English, Hindi, or Tamil

Wait for processing

Listen to the voice response

View chat history with timestamps

📁 Project Structure
text
bharatvoice/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── service-accountKey.json
├── frontend/
│   ├── lib/
│   │   └── main.dart
│   ├── pubspec.yaml
│   └── assets/
│       └── mic.png
└── README.md
🌐 Language Support
Language	Detection	Response	Voice Output
English	✅	✅	✅
Hindi	✅	✅	✅
Tamil	✅	✅	✅
🤝 Contributing
Fork the repository

Create your feature branch (git checkout -b feature/AmazingFeature)

Commit changes (git commit -m 'Add AmazingFeature')

Push to branch (git push origin feature/AmazingFeature)

Open a Pull Request

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
Google Cloud Platform for Speech APIs

Flutter community for excellent packages

Contributors and testers

📧 Contact
Name - BALASRISABHARI B  - b.balasrisabhari@gmail.com.com
 

Made with ❤️ for Digital India
