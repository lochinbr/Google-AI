
import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { ChatMessage, NewsArticle, YouTubeVideo } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

let chat: Chat | null = null;

const getChat = (): Chat => {
    if (!chat) {
        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: [],
        });
    }
    return chat;
}

export const streamChatResponse = (message: string) => {
    const chatInstance = getChat();
    return chatInstance.sendMessageStream({ message });
};

export const getComplexResponse = async (prompt: string): Promise<string> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error getting complex response:", error);
        return "Sorry, I encountered an error while processing your complex request.";
    }
};


export const fetchAndSummarizeNews = async (url: string): Promise<NewsArticle[]> => {
    try {
        const prompt = `
            Analyze the website ${url} and find the latest news articles from the last two weeks.
            Respond with a valid JSON array of objects. Each object must represent a news article and have these exact keys: "title" (string), "summary" (string), and "link" (string).
            
            Example response format:
            [
              {
                "title": "Example News Title",
                "summary": "A brief summary of the example news article.",
                "link": "https://example.com/news/article1"
              }
            ]

            If you cannot find any recent news articles or cannot access the content, respond with an empty JSON array: [].
            Your entire response should be ONLY the JSON array. Do not include any other text, explanations, or markdown formatting.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        let text = response.text.trim();
        
        const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
            text = match[1];
        }

        const arrayStartIndex = text.indexOf('[');
        const arrayEndIndex = text.lastIndexOf(']');

        if (arrayStartIndex === -1 || arrayEndIndex === -1) {
            console.warn(`No JSON array found in Gemini response for ${url}. Response text:`, response.text);
            return [];
        }

        const jsonString = text.substring(arrayStartIndex, arrayEndIndex + 1);

        try {
            const articles: NewsArticle[] = JSON.parse(jsonString);
            return articles;
        } catch (e) {
            console.error(`Error parsing JSON from Gemini response for ${url}. String to parse:`, jsonString, `Original response:`, response.text, `Error:`, e);
            return [];
        }
    } catch (error) {
        console.error(`Error fetching news from Gemini for ${url}:`, error);
        return [];
    }
};

export const generateTagsForNewsSource = async (url: string): Promise<string[]> => {
    try {
        const prompt = `
            Analyze the content of the website at this URL: ${url}.
            Based on its main topics, generate a list of 3 to 5 relevant one-word or two-word tags.
            These tags should categorize the website's content (e.g., "Technology", "AI", "Open Source", "Cybersecurity", "Developer Tools").
            Respond with a valid JSON array of strings.
            
            Example response format:
            ["Technology", "Developer Tools", "Networking", "Security"]

            Your entire response should be ONLY the JSON array. Do not include any other text, explanations, or markdown formatting.
            If you cannot analyze the URL, return an empty JSON array: [].
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        
        let text = response.text.trim();
        
        const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
            text = match[1];
        }

        const arrayStartIndex = text.indexOf('[');
        const arrayEndIndex = text.lastIndexOf(']');

        if (arrayStartIndex === -1 || arrayEndIndex === -1) {
            console.warn(`No JSON array for tags found in Gemini response for ${url}.`);
            return [];
        }

        const jsonString = text.substring(arrayStartIndex, arrayEndIndex + 1);

        try {
            const tags: string[] = JSON.parse(jsonString);
            return tags.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());
        } catch (e) {
            console.error(`Error parsing tags JSON from Gemini for ${url}:`, e);
            return [];
        }
    } catch (error) {
        console.error(`Error generating tags with Gemini for ${url}:`, error);
        return [];
    }
};

export interface YouTubeSearchParams {
    tags: string[];
    sortBy: 'relevance' | 'date';
    timeFrame: 'any' | 'day' | 'week' | 'month' | 'year';
    page: number;
}

export const searchYouTubeVideos = async ({ tags, sortBy, timeFrame, page }: YouTubeSearchParams): Promise<YouTubeVideo[]> => {
    if (tags.length === 0) return [];
    
    const timeFrameMap = {
        any: 'any time',
        day: 'the last 24 hours',
        week: 'the last week',
        month: 'the last month',
        year: 'the last year'
    };

    try {
        const prompt = `
            You are an expert YouTube video search assistant, designed to find relevant videos using Google Search. Your task is to construct a search query and return a structured JSON response.

            **Instructions:**
            1.  **Analyze Tags & Construct Search Query:** Create a Google Search query to find YouTube videos where the primary topics are related to "${tags.join(', ')}". Prioritize videos where these terms appear prominently in the title or description. The query should look like this: \`(${tags.join(' OR ')}) site:youtube.com\`.
            2.  **Filter and Sort:** Apply the following filters to the search results:
                *   **Sort by:** ${sortBy} (If sorting by date, prioritize the newest videos first).
                *   **Published within:** ${timeFrameMap[timeFrame]}.
            3.  **Pagination:** Return page **${page}** of the results. Assume 20 videos per page. Do your best to find 20 unique videos for the requested page.
            4.  **Format Output:** Respond with a valid JSON array of objects. Each object must represent a unique YouTube video and have these exact keys:
                *   "id": string (the unique YouTube video ID)
                *   "title": string
                *   "channelTitle": string
                *   "publishedAt": string (the publication date in ISO 8601 format)
                *   "url": string (the full "https://www.youtube.com/watch?v=..." URL)
                *   "description": string (a brief, 1-2 sentence summary of the video)

            **Current Request:**
            *   **Tags:** "${tags.join(', ')}"
            *   **Sort by:** ${sortBy}
            *   **Time Frame:** ${timeFrameMap[timeFrame]}
            *   **Page:** ${page}
            
            Example of a single object in the array:
            {
              "id": "dQw4w9WgXcQ",
              "title": "Example Video Title",
              "channelTitle": "Example Channel",
              "publishedAt": "2023-10-26T10:00:00Z",
              "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              "description": "A short summary of what the video is about."
            }

            **Important:**
            *   If no videos are found for the given criteria, respond with an empty JSON array: \`[]\`.
            *   Your entire response must be ONLY the JSON array. Do not include any other text, explanations, or markdown formatting.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                thinkingConfig: { thinkingBudget: 32768 }
            },
        });

        let text = response.text.trim();
        
        const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
            text = match[1];
        }

        const arrayStartIndex = text.indexOf('[');
        const arrayEndIndex = text.lastIndexOf(']');

        if (arrayStartIndex === -1 || arrayEndIndex === -1) {
            console.warn(`No JSON array found in YouTube search response. Response text:`, response.text);
            return [];
        }

        const jsonString = text.substring(arrayStartIndex, arrayEndIndex + 1);

        try {
            // The AI response won't have the thumbnailUrl, so we define a temporary type.
            type VideoFromAI = Omit<YouTubeVideo, 'thumbnailUrl'>;
            const videosFromAI: VideoFromAI[] = JSON.parse(jsonString);
            
            // Programmatically construct the thumbnail URL for reliability.
            const videosWithThumbnails: YouTubeVideo[] = videosFromAI.map(video => ({
                ...video,
                thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
            }));

            return videosWithThumbnails;
        } catch (e) {
            console.error(`Error parsing YouTube videos JSON. String to parse:`, jsonString, `Original response:`, response.text, `Error:`, e);
            throw new Error("The AI returned an invalid response. Please try again.");
        }
    } catch (error) {
        console.error(`Error fetching YouTube videos from Gemini:`, error);
        if (error instanceof Error) {
           throw error;
        }
        throw new Error("Failed to fetch YouTube videos. Please try again.");
    }
};