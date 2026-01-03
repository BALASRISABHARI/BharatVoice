// firestoreHelper.js - Firestore database helper
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class FirestoreHelper {
  constructor() {
    try {
      // Initialize Firebase with service account
      const serviceAccount = JSON.parse(
        fs.readFileSync(join(__dirname, 'service-accountKey.json'), 'utf8')
      );
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      
      this.db = admin.firestore();
      this.intentsCollection = this.db.collection('intents');
      console.log('✅ Firestore initialized');
      
    } catch (error) {
      console.log('❌ Firestore initialization error:', error.message);
      console.log('📝 Using local intents.json as fallback');
      this.db = null;
      this.loadLocalIntents();
    }
  }

  loadLocalIntents() {
    try {
      const intentsPath = join(__dirname, 'intents.json');
      const intentsData = JSON.parse(fs.readFileSync(intentsPath, 'utf8'));
      this.localIntents = intentsData.intents;
      console.log(`📁 Loaded ${this.localIntents.length} intents from local file`);
    } catch (error) {
      console.log('❌ Failed to load local intents:', error.message);
      this.localIntents = [];
    }
  }

  // Get answer for intent in specific language
  async getAnswer(intentId, language = 'en') {
    try {
      // Try Firestore first
      if (this.db) {
        const doc = await this.intentsCollection.doc(intentId).get();
        if (doc.exists) {
          const data = doc.data();
          return data.answers[language] || data.answers.en || 'Answer not available';
        }
      }
      
      // Fallback to local intents
      const intent = this.localIntents.find(i => i.id === intentId);
      if (intent && intent.answers[language]) {
        return intent.answers[language];
      }
      
      return `Information for ${intentId} is not available.`;
      
    } catch (error) {
      console.log('❌ Error getting answer:', error.message);
      return 'Sorry, I cannot retrieve the information at the moment.';
    }
  }

  // Get all intents (for debugging)
  async getAllIntents() {
    if (this.db) {
      const snapshot = await this.intentsCollection.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return this.localIntents;
  }
}

export default FirestoreHelper;