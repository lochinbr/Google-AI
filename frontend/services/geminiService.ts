import { GenerateContentResponse } from "@google/genai";
import { NewsArticle, YouTubeVideo } from '../types';

// The API key is no longer needed on the frontend.

// Generic proxy function for non-streaming generateContent calls
async function callProxy<T>(body: object): Promise<T> {
    const response = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request to proxy failed');
    }
    return response.json();
}

export const streamChatResponse = (message: string) => {
    // This returns an object that can be iterated over with `for await...of`
    return {
        async *[Symbol.asyncIterator]() {
            const response = await fetch('/api/gemini-chat-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });

            if (!response.body) {
                return;
            }
            
            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                // SSE messages are separated by double newlines
                const lines = value.split('\n\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonString = line.substring(6);
                        if (jsonString) {
                            try {
                                yield JSON.parse(jsonString);
                            } catch (e) {
                                console.error("Error parsing stream chunk:", e, "Chunk:", jsonString);
                            }
                        }
                    }
                }
            }
        }
    };
};


export const getComplexResponse = async (prompt: string): Promise<string> => {
    try {
        const response: GenerateContentResponse = await callProxy<GenerateContentResponse>({
            endpoint: 'generateContent',
            params: {
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 32768 }
                }
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
            Your entire response should be ONLY the JSON array. Do not include any other text, explanations, or markdown formatting.
        `;

        const response: GenerateContentResponse = await callProxy<GenerateContentResponse>({
            endpoint: 'generateContent',
            params: {
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            }
        });

        let text = response.text.trim();
        const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) text = match[1];

        const arrayStartIndex = text.indexOf('[');
        const arrayEndIndex = text.lastIndexOf(']');
        if (arrayStartIndex === -1 || arrayEndIndex === -1) return [];

        const jsonString = text.substring(arrayStartIndex, arrayEndIndex + 1);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error(`Error fetching or parsing news from ${url}:`, error);
        return [];
    }
};

export const generateTagsForNewsSource = async (url: string): Promise<string[]> => {
    try {
        const prompt = `
            Analyze the content of the website at this URL: ${url}.
            Based on its main topics, generate a list of 3 to 5 relevant one-word or two-word tags.
            Respond with a valid JSON array of strings.
            Your entire response should be ONLY the JSON array.
        `;

        const response: GenerateContentResponse = await callProxy<GenerateContentResponse>({
            endpoint: 'generateContent',
            params: {
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            }
        });
        
        let text = response.text.trim();
        const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) text = match[1];

        const arrayStartIndex = text.indexOf('[');
        const arrayEndIndex = text.lastIndexOf(']');
        if (arrayStartIndex === -1 || arrayEndIndex === -1) return [];

        const jsonString = text.substring(arrayStartIndex, arrayEndIndex + 1);
        const tags: string[] = JSON.parse(jsonString);
        return tags.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());
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
    
    const timeFrameMap = { any: 'any time', day: 'the last 24 hours', week: 'the last week', month: 'the last month', year: 'the last year' };

    try {
        const prompt = `
            You are an expert YouTube video search assistant. Your task is to find relevant videos using Google Search and return a structured JSON response.
            **Instructions:**
            1.  **Search Query:** Find YouTube videos where the primary topics are "${tags.join(', ')}". Use a query like \`(${tags.join(' OR ')}) site:youtube.com\`.
            2.  **Filters:** Sort by ${sortBy} and find videos published within ${timeFrameMap[timeFrame]}.
            3.  **Pagination:** Return page ${page} of the results (20 videos per page).
            4.  **Format Output:** Respond with a valid JSON array of objects. Each object must have these keys: "id" (string), "title" (string), "channelTitle" (string), "publishedAt" (ISO 8601 string), "url" (string), "description" (string).
            **Important:** Your entire response must be ONLY the JSON array. If no videos are found, return an empty array \`[]\`.
        `;

        const response: GenerateContentResponse = await callProxy<GenerateContentResponse>({
            endpoint: 'generateContent',
            params: {
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    thinkingConfig: { thinkingBudget: 32768 }
                },
            }
        });

        let text = response.text.trim();
        const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) text = match[1];

        const arrayStartIndex = text.indexOf('[');
        const arrayEndIndex = text.lastIndexOf(']');
        if (arrayStartIndex === -1 || arrayEndIndex === -1) {
             throw new Error("The AI returned a response without a valid JSON array.");
        }

        const jsonString = text.substring(arrayStartIndex, arrayEndIndex + 1);
        type VideoFromAI = Omit<YouTubeVideo, 'thumbnailUrl'>;
        const videosFromAI: VideoFromAI[] = JSON.parse(jsonString);
        
        return videosFromAI.map(video => ({
            ...video,
            thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
        }));
    } catch (error) {
        console.error(`Error fetching YouTube videos from Gemini:`, error);
        if (error instanceof Error && error.message.includes("The AI returned")) {
           throw error;
        }
        throw new Error("Failed to fetch YouTube videos. The AI may be unavailable or the request failed.");
    }
};
