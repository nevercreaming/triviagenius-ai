
import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

/**
 * Generates trivia questions using the Gemini API.
 * Follows the latest @google/genai SDK guidelines for model selection and response handling.
 */
export async function generateTriviaQuestions(
  categories: string[],
  difficulty: string,
  count: number = 5
): Promise<Question[]> {
  // Initialize AI instance inside the function to ensure process.env.API_KEY is latest
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const categoriesText = categories.length > 0 ? categories.join(", ") : "General Knowledge";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `Generate ${count} fun and accurate multiple-choice trivia questions. 
              Mix them from these topics: ${categoriesText}.
              Make them ${difficulty} difficulty. 
              Keep the explanations short, fun, and easy to read.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { 
                type: Type.STRING, 
                description: "The trivia question" 
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Four choices"
              },
              correctAnswerIndex: {
                type: Type.INTEGER,
                description: "Correct index (0-3)"
              },
              explanation: {
                type: Type.STRING,
                description: "A quick fun fact about the answer"
              },
              category: {
                type: Type.STRING,
                description: "The category"
              }
            },
            required: ["text", "options", "correctAnswerIndex", "explanation", "category"]
          }
        }
      }
    });

    if (!response) {
      throw new Error("No response received from the Gemini API.");
    }

    const jsonStr = response.text;
    if (!jsonStr) {
      throw new Error("The AI model returned an empty response body.");
    }

    const questionsData = JSON.parse(jsonStr.trim());
    
    return questionsData.map((q: any, index: number) => ({
      ...q,
      id: `${Date.now()}-${index}`,
      difficulty
    }));
  } catch (error: any) {
    console.error("Trivia Generation Error:", error);
    let errorMessage = "Oops! Something went wrong getting the questions.";
    if (error.message?.includes("Requested entity was not found")) {
      errorMessage = "API error. Check your key.";
    } else if (error.message?.includes("Safety")) {
      errorMessage = "The AI didn't like those topics. Try something else!";
    }
    throw new Error(errorMessage);
  }
}
