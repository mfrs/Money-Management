import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: "AIzaSyAPhRxxqIqP6b2gCG038t99I244zSMa_C0" });
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: "Hello"
    });
    console.log(response.text);
  } catch(e) {
    console.error(e.message);
  }
}
run();
