import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { ChatMessage } from '../types';
import { streamChatResponse, getComplexResponse } from '../services/geminiService';
import { ChatIcon, CloseIcon, SendIcon, SparklesIcon } from './icons';

export const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isThinkingMode, setIsThinkingMode] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        if (isThinkingMode) {
             const modelResponse = await getComplexResponse(input);
             const modelMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: modelResponse };
             setMessages(prev => [...prev, modelMessage]);
             setIsLoading(false);
        } else {
            const modelMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: '' };
            setMessages(prev => [...prev, modelMessage]);

            try {
                const stream = streamChatResponse(input);
                let currentText = '';
                for await (const chunk of stream) {
                    currentText += chunk.text;
                    setMessages(prev => prev.map(msg => 
                        msg.id === modelMessage.id ? { ...msg, text: currentText } : msg
                    ));
                }
            } catch (error) {
                console.error("Streaming chat failed:", error);
                setMessages(prev => prev.map(msg => 
                    msg.id === modelMessage.id ? { ...msg, text: "Sorry, something went wrong." } : msg
                ));
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-sky-600 hover:bg-sky-500 text-white rounded-full p-4 shadow-lg z-50 transition-transform transform hover:scale-110"
                aria-label="Open chat"
            >
                <ChatIcon className="w-8 h-8" />
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 w-full max-w-md h-[70vh] max-h-[600px] bg-zinc-800/80 backdrop-blur-md rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden border border-zinc-700">
                    <header className="p-4 flex justify-between items-center bg-zinc-900/50 border-b border-zinc-700">
                        <div>
                            <h3 className="font-bold text-white">AI Assistant</h3>
                            <p className={`text-xs ${isThinkingMode ? 'text-violet-400' : 'text-sky-400'}`}>
                                {isThinkingMode ? 'Thinking Mode (Gemini 2.5 Pro)' : 'Standard Mode (Gemini 2.5 Flash)'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                             <label htmlFor="thinking-toggle" className="flex items-center cursor-pointer">
                                <SparklesIcon className={`w-5 h-5 mr-1 ${isThinkingMode ? 'text-violet-400' : 'text-zinc-400'}`} />
                                <div className="relative">
                                    <input type="checkbox" id="thinking-toggle" className="sr-only" checked={isThinkingMode} onChange={() => setIsThinkingMode(!isThinkingMode)} />
                                    <div className="block bg-zinc-600 w-10 h-6 rounded-full"></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${isThinkingMode ? 'transform translate-x-full bg-violet-400' : ''}`}></div>
                                </div>
                            </label>
                            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs md:max-w-sm px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-sky-600 text-white rounded-br-lg' : 'bg-zinc-700 text-zinc-200 rounded-bl-lg'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && messages[messages.length - 1]?.role === 'user' && (
                             <div className="flex justify-start">
                                <div className="max-w-xs md:max-w-sm px-4 py-2 rounded-2xl bg-zinc-700 text-zinc-200 rounded-bl-lg flex items-center gap-2">
                                     <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse delay-0"></div>
                                     <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse delay-200"></div>
                                     <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse delay-400"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 bg-zinc-900/50 border-t border-zinc-700">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isThinkingMode ? "Ask a complex question..." : "Ask a question..."}
                                className="flex-1 bg-zinc-700 text-zinc-200 rounded-full px-4 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                                disabled={isLoading}
                            />
                            <button type="submit" className="bg-sky-600 text-white rounded-full p-2 disabled:bg-zinc-600" disabled={isLoading || !input.trim()}>
                                <SendIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};