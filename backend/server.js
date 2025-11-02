
const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Generic proxy for non-streaming generateContent calls
app.post('/api/gemini-proxy', async (req, res) => {
  try {
    const { model, contents, config } = req.body;

    if (!model || !contents) {
        return res.status(400).json({ error: 'Missing model or contents in request body.' });
    }
    
    const result = await ai.models.generateContent({ model, contents, config });
    res.json(result);

  } catch (error) {
    console.error('Error proxying to Gemini:', error);
    res.status(500).json({ error: 'Failed to get response from AI.' });
  }
});

// Proxy for streaming chat responses
app.post('/api/gemini-chat-stream', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Missing message in request body.' });
        }
        
        // In a real-world app, you might manage chat history/sessions differently.
        const chat = ai.chats.create({ model: 'gemini-2.5-flash', history: [] });
        const stream = await chat.sendMessageStream({ message });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.end();

    } catch (error) {
        console.error('Error streaming chat:', error);
        res.end();
    }
});

const PORT = 3001; // The backend runs on its own port inside the Docker network
app.listen(PORT, () => {
  console.log(`Backend proxy server listening on port ${PORT}`);
});
