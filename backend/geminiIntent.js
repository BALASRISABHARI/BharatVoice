import { VertexAI } from "@google-cloud/vertexai";
import path from "path";
import { fileURLToPath } from "url";

// Needed for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔐 Vertex AI Client (Service Account Auth)
const vertexAI = new VertexAI({
  project: "bharatvoice-483011",
  location: "us-central1",
  googleAuthOptions: {
    keyFile: path.join(__dirname, "service-account.json"),
  },
});

// ✅ Gemini model
const model = vertexAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

export async function detectIntent(userText) {
  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: userText }],
        },
      ],
    });

    const response =
      result.response.candidates[0].content.parts[0].text;

    return response;
  } catch (err) {
    console.error("❌ GEMINI ERROR:", err.message);
    return "Sorry, I could not understand that.";
  }
}
