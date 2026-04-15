const getApiKey = () => import.meta.env.VITE_MISTRAL_API_KEY || "";

export interface VerificationResult {
  isReal: boolean;
  confidenceScore: number;
  summary: string;
  suggestedCategory?: string;
  warning?: string;
  verified_at?: string;
}

export const verifyPlaceWithAI = async (
  placeName: string,
  category: string,
  description: string,
  city: string,
  state: string
): Promise<VerificationResult> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      isReal: false,
      confidenceScore: 0,
      summary: "API key missing",
    };
  }

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          {
            role: "user",
            content: `
Verify this place:

Place Name: ${placeName}
Category: ${category}
Description: ${description}
City: ${city}
State: ${state}

Return only valid JSON:
{
  "isReal": true,
  "confidenceScore": 85,
  "summary": "Valid place"
}
            `,
          },
        ],
      }),
    });

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty AI response");
    }

    const cleanText = content.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleanText);

    return {
      isReal: result.isReal ?? false,
      confidenceScore: Number(result.confidenceScore) || 0,
      summary: result.summary || "No summary",
      suggestedCategory: result.suggestedCategory,
      warning: result.warning,
      verified_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Verification Error:", error);

    return {
      isReal: false,
      confidenceScore: 0,
      summary: "Verification failed",
    };
  }
};

export interface TravelOptions {
  hotels: {
    name: string;
    rating: number;
    price: string;
    description: string;
    image_url: string;
    amenities: string[];
  }[];
  flights: {
    airline: string;
    duration: string;
    price: string;
    departure: string;
    arrival: string;
    stops: string;
  }[];
}

export const searchTravelOptions = async (
  source: string,
  destination: string
): Promise<TravelOptions> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("API key missing");
  }

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          {
            role: "user",
            content: `
Search travel options from ${source} to ${destination}.

Return valid JSON:
{
  "hotels": [],
  "flights": []
}
            `,
          },
        ],
      }),
    });

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty travel response");
    }

    const cleanText = content.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleanText);

    return {
      hotels: result.hotels || [],
      flights: result.flights || [],
    };
  } catch (error) {
    console.error("Travel Search Error:", error);

    return {
      hotels: [],
      flights: [],
    };
  }
};