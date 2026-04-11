# 🇮🇳 BharatVoice - Multilingual Voice Assistant

[![Flutter](https://img.shields.io/badge/Flutter-3.x-blue.svg)](https://flutter.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Speech%20%7C%20TTS-orange.svg)](https://cloud.google.com)

BharatVoice is an AI-powered multilingual voice assistant application that enables users to access government service information and track their application statuses through natural voice conversations. It supports **English**, **Hindi**, **Tamil**, **Telugu**, and **Marathi**. The app automatically detects the user's spoken language and responds in the same language, making digital information accessible to diverse linguistic populations.

---

## ✨ Features

| Icon | Feature | Description |
|------|---------|-------------|
| 🎤 | **Voice-based Interface** | Push-to-talk voice interaction |
| 🌐 | **Automatic Language Detection** | Supports English, Hindi, Tamil, Telugu, and Marathi |
| 🤖 | **AI-Powered Responses** | Intelligent intent detection for government services |
| 📊 | **Status Tracking** | Track application statuses based on user-provided IDs with a robust mock dataset |
| 🔊 | **Text-to-Speech** | Voice responses in detected language |
| 💬 | **Chat History** | View conversation history with timestamps |
| 🔄 | **Multi-language Switching** | Switch languages mid-conversation seamlessly |

---

## 🎯 Supported Queries

| Category | Description |
|----------|-------------|
| ⏰ **Time** | Current time information |
| 🎓 **Scholarship** | Scholarship application guidance |
| 🛒 **Ration Card** | Ration card information |
| 🪪 **Aadhaar** | Aadhaar card services |
| 👵 **Pension** | Pension scheme details |
| 📋 **Status Tracking** | Track service application status via User ID |

---

## 🏗️ Architecture
<img width="249" height="285" alt="image" src="https://github.com/user-attachments/assets/6a53d2be-97ab-44dd-806b-11364650d2fe" />

---

## 🚀 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Flutter | Cross-platform mobile framework |
| record | Audio recording |
| audioplayers | Audio playback |
| http | API communication |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express | Web framework |
| Multer | File upload handling |

### Google Cloud Services
| Service | Purpose |
|---------|---------|
| Speech-to-Text API | Voice transcription |
| Text-to-Speech API | Voice synthesis |
| Google AI Studio | Language processing |

---

## 📋 Prerequisites

- ✅ Flutter SDK (3.x)
- ✅ Node.js (18.x)
- ✅ Google Cloud account with APIs enabled
- ✅ Service account key for Google Cloud
- ✅ Gemini API Key

---

## 🛠️ Setup Instructions

### 1. Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up Google Cloud Credentials:
   - Place your service account JSON file securely.
   - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of this JSON file.
4. Set up Gemini API key:
   - Create a `.env` file or export the `GEMINI_API_KEY` environment variable.
5. Start the server:
   ```bash
   npm start
   # or
   node server.js
   ```

### 2. Frontend (Mobile App) Setup

1. Navigate to the `mobile_app` directory:
   ```bash
   cd mobile_app
   ```
2. Install flutter dependencies:
   ```bash
   flutter pub get
   ```
3. Update the API URL:
   - Open `lib/main.dart` and ensure the backend URL correctly points to your running Node.js server (e.g., `http://10.0.2.2:3000` for Android emulator or your local IP).
4. Run the app:
   ```bash
   flutter run
   ```

---

## 📱 Using the App
- 📱 Tap the microphone button
- 🗣️ Speak your query in English, Hindi, Tamil, Telugu, or Marathi
- ⏳ Wait for processing
- 🔊 Listen to the voice response
- 💬 View chat history with timestamps

<img width="374" height="493" alt="image" src="https://github.com/user-attachments/assets/da577026-5efc-4f58-aa63-049e76bc9128" />

<img width="656" height="332" alt="image" src="https://github.com/user-attachments/assets/91282d34-f1d7-46db-ad70-a1369fc6c406" />


## 🙏 Acknowledgments
- ☁️ Google Cloud Platform for Speech APIs
- 💙 Flutter community for excellent packages
- 👥 Contributors and testers

## 📧 Contact
Your Name - BALASRISABHARI B - b.balasrisabhari@gmail.com

<p align="center"> Made with ❤️ for Digital India </p>
