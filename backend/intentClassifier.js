// intentClassifier.js - Gemini for intent classification ONLY
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class IntentClassifier {
  constructor() {
    const credPath = path.join(__dirname, 'service-accountKey.json');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    
    try {
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-pro",
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.1, // Low temperature for consistent classification
        }
      });
      console.log('✅ Intent Classifier initialized');
    } catch (error) {
      console.log('❌ Intent Classifier error:', error.message);
      this.model = null;
    }
  }

  // Classify user query into predefined intent
  async classifyQuery(transcript) {
    if (!this.model) {
      return this.fallbackClassification(transcript);
    }

    // Predefined intents (from intents.json)
    const predefinedIntents = [
      'GREETING',
      'SCHOLARSHIP_STATUS', 
      'RATION_CARD',
      'AADHAAR_UPDATE',
      'PENSION_STATUS',
      'UNKNOWN'
    ];

    const prompt = `
    You are an intent classifier for BharatVoice - a verified public information assistant.
    
    USER QUERY: "${transcript}"
    
    Available intents (ONLY return one of these):
    - GREETING: User is saying hello/hi (e.g., "hello", "hi", "namaste", "good morning")
    - SCHOLARSHIP_STATUS: User is asking about scholarship (e.g., "scholarship status", "education aid", "college fund")
    - RATION_CARD: User is asking about ration card (e.g., "ration card", "food card", "apply ration")
    - AADHAAR_UPDATE: User is asking about Aadhaar (e.g., "aadhaar update", "uidai", "aadhaar card")
    - PENSION_STATUS: User is asking about pension (e.g., "pension", "old age pension", "retirement fund")
    - UNKNOWN: If query doesn't match any above
    
    IMPORTANT RULES:
    1. Return ONLY the intent ID (e.g., "SCHOLARSHIP_STATUS")
    2. NO explanations
    3. NO additional text
    4. If unsure, return "UNKNOWN"
    5. Be strict - only match if query clearly relates to the intent
    
    RESPONSE FORMAT: Just the intent ID
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text().trim();
      
      // Validate response is one of our intents
      if (predefinedIntents.includes(response)) {
        return response;
      } else {
        console.log('⚠️  Gemini returned invalid intent:', response);
        return 'UNKNOWN';
      }
      
    } catch (error) {
      console.log('❌ Classification error:', error.message);
      return this.fallbackClassification(transcript);
    }
  }

  // Fallback classification without Gemini
  fallbackClassification(transcript) {
    const lower = transcript.toLowerCase();
    
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('namaste')) {
      return 'GREETING';
    } else if (lower.includes('scholarship')) {
      return 'SCHOLARSHIP_STATUS';
    } else if (lower.includes('ration')) {
      return 'RATION_CARD';
    } else if (lower.includes('aadhaar')) {
      return 'AADHAAR_UPDATE';
    } else if (lower.includes('pension')) {
      return 'PENSION_STATUS';
    } else {
      return 'UNKNOWN';
    }
  }
}

export default IntentClassifier;