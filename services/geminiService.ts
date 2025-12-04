import { GoogleGenAI } from "@google/genai";

export const generatePattern = async (prompt: string): Promise<string | null> => {
  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    console.warn("API Key missing for Gemini");
    // Simulate a delay and return a placeholder if no key
    await new Promise(resolve => setTimeout(resolve, 1500));
    return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/500/500`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // Using gemini-2.5-flash-image for generation as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Generate a seamless texture or illustration suitable for a hand fan design. Style: ${prompt}` }]
      }
    });

    // Check for image parts in the response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    // Fallback if no image found in response structure (or use Imagen if configured)
    return null;

  } catch (error) {
    console.error("Error generating pattern:", error);
    return null;
  }
};

export const removeBackgroundMock = async (file: File): Promise<string> => {
    // Real background removal requires complex heavy processing or an external API.
    // We are mocking this service to demonstrate the UI flow.
    return new Promise((resolve) => {
        setTimeout(() => {
            // In a real app, this would return the URL of the processed image
            resolve(URL.createObjectURL(file)); 
        }, 2000);
    });
}