# 🇮🇳 BharatVoice - Multilingual Voice Assistant

[![Flutter](https://img.shields.io/badge/Flutter-3.x-blue.svg)](https://flutter.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Speech%20%7C%20TTS-orange.svg)](https://cloud.google.com)

BharatVoice is an AI-powered multilingual voice assistant application that enables users to access government service information through natural voice conversations in **English**, **Hindi**, and **Tamil**. The app automatically detects the user's spoken language and responds in the same language, making digital information accessible to diverse linguistic populations.

---

## ✨ Features

| Icon | Feature | Description |
|------|---------|-------------|
| 🎤 | **Voice-based Interface** | Push-to-talk voice interaction |
| 🌐 | **Automatic Language Detection** | Supports English, Hindi, and Tamil |
| 🤖 | **AI-Powered Responses** | Intelligent intent detection for government services |
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

---

## 🏗️ Architecture
┌─────────────────┐ ┌──────────────────┐ ┌─────────────────────┐
│ │ │ │ │ │
│ Flutter │────▶│ Node.js │────▶│ Google Cloud │
│ Frontend │◀────│ Backend │◀────│ APIs │
│ │ │ │ │ │
└─────────────────┘ └──────────────────┘ └─────────────────────┘
