import React, { useState, FormEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import { NewsSource, NewsArticle } from '../types';
import { fetchAndSummarizeNews, generateTagsForNewsSource } from '../services/geminiService';
import { PlusIcon, TrashIcon, TagIcon, BackIcon } from './icons';

interface AddNewsSourceFormProps {
    onAddSource: (source: NewsSource) => void;
    sources: NewsSource[];
}

export const AddNewsSourceForm: React.FC<AddNewsSourceFormProps> = ({ onAddSource, sources }) => {
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [step, setStep] = useState<'input' | 'tags'>('input');
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
    const [customTag, setCustomTag] = useState('');

    const resetForm = () => {
        setUrl('');
        setError(null);
        setIsLoading(false);
        setStep('input');
        setSuggestedTags([]);
        setSelectedTags(new Set());
        setCustomTag('');
    };

    const handleUrlSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const normalizedUrl = new URL(url).origin;
            if (sources.some(s => new URL(s.url).origin === normalizedUrl)) {
                setError('News source already added.');
                setIsLoading(false);
                return;
            }
            
            const tags = await generateTagsForNewsSource(normalizedUrl);
            setSuggestedTags(tags);
            setSelectedTags(new Set(tags));
            setStep('tags');

        } catch (err) {
            setError('Please enter a valid URL.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const toggleTag = (tag: string) => {
        setSelectedTags(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tag)) {
                newSet.delete(tag);
            } else {
                newSet.add(tag);
            }
            return newSet;
        });
    };

    const handleAddCustomTag = (e: FormEvent) => {
        e.preventDefault();
        const formattedTag = customTag.trim().charAt(0).toUpperCase() + customTag.trim().slice(1).toLowerCase();
        if(formattedTag && !selectedTags.has(formattedTag)) {
            setSelectedTags(prev => new Set(prev).add(formattedTag));
        }
        setCustomTag('');
    }

    const handleFinalSubmit = () => {
        const normalizedUrl = new URL(url).origin;
        onAddSource({ 
            id: Date.now().toString(), 
            url: normalizedUrl, 
            tags: Array.from(selectedTags)
        });
        resetForm();
    };

    if (step === 'tags') {
        return (
            <div className="p-4 bg-zinc-800/50 rounded-lg mb-8 border border-zinc-700 relative">
                <button onClick={resetForm} className="absolute top-3 right-3 text-zinc-400 hover:text-white transition">
                    <BackIcon className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-semibold text-zinc-200 mb-1">Categorize Source</h3>
                <p className="text-sm text-zinc-400 mb-4 break-all">What topics does <span className="font-medium text-sky-400">{new URL(url).hostname}</span> cover?</p>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Suggested Tags</label>
                    <div className="flex flex-wrap gap-2">
                        {suggestedTags.length > 0 ? suggestedTags.map(tag => (
                            <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1 text-sm rounded-full transition ${selectedTags.has(tag) ? 'bg-sky-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'}`}>
                                {tag}
                            </button>
                        )) : <p className="text-sm text-zinc-500">No suggestions available.</p>}
                    </div>
                </div>

                 <form onSubmit={handleAddCustomTag} className="mb-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Add Custom Tag</label>
                    <div className="flex gap-2">
                        <input type="text" value={customTag} onChange={e => setCustomTag(e.target.value)} placeholder="e.g. AI" className="flex-grow bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-none transition text-sm" />
                        <button type="submit" className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold p-2 rounded-md flex items-center justify-center disabled:bg-zinc-700 disabled:cursor-not-allowed transition" disabled={!customTag.trim()}>
                            <PlusIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </form>

                <div className="flex justify-end">
                     <button onClick={handleFinalSubmit} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition">
                        Add News Source
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleUrlSubmit} className="p-4 bg-zinc-800/50 rounded-lg mb-8 border border-zinc-700">
            <label htmlFor="news-url" className="block text-sm font-medium text-zinc-300 mb-2">
                News Website URL
            </label>
            <div className="flex gap-2">
                <input
                    id="news-url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://techcrunch.com"
                    className="flex-grow bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
                />
                <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center disabled:bg-zinc-600 disabled:cursor-not-allowed transition"
                    disabled={!url || isLoading}
                >
                     {isLoading ? (
                        <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                    ) : (
                        <PlusIcon className="w-5 h-5" />
                    )}
                </button>
            </div>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </form>
    );
};


interface NewsDisplayProps {
    sources: NewsSource[];
    onRemoveSource: (id: string) => void;
}

export const NewsDisplay: React.FC<NewsDisplayProps> = ({ sources, onRemoveSource }) => {
    const [articles, setArticles] = useState<Record<string, NewsArticle[]>>({});
    const [loadingSources, setLoadingSources] = useState<Record<string, boolean>>({});
    const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        sources.forEach(source => source.tags.forEach(tag => tags.add(tag)));
        return Array.from(tags).sort();
    }, [sources]);
    
    const toggleFilter = (tag: string) => {
        setActiveFilters(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tag)) newSet.delete(tag);
            else newSet.add(tag);
            return newSet;
        });
    }

    const filteredSources = useMemo(() => {
        if (activeFilters.size === 0) return sources;
        return sources.filter(source => source.tags.some(tag => activeFilters.has(tag)));
    }, [sources, activeFilters]);

    const fetchNewsForSource = useCallback(async (source: NewsSource, isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) {
            setLoadingSources(prev => ({ ...prev, [source.id]: true }));
        }
        try {
            const fetchedArticles = await fetchAndSummarizeNews(source.url);
            setArticles(prev => {
                const currentArticles = prev[source.id] || [];
                const currentLinks = new Set(currentArticles.map(a => a.link));
                const newUniqueArticles = fetchedArticles.filter(a => !currentLinks.has(a.link));
                return { ...prev, [source.id]: [...newUniqueArticles, ...currentArticles] };
            });
        } catch (error) {
            console.error(`Failed to fetch news for ${source.url}`, error);
            if (!isBackgroundRefresh) {
                setArticles(prev => ({ ...prev, [source.id]: prev[source.id] || [] }));
            }
        } finally {
             if (!isBackgroundRefresh) {
                setLoadingSources(prev => ({ ...prev, [source.id]: false }));
            }
        }
    }, []);
    
    useEffect(() => {
        sources.forEach(source => {
            if (articles[source.id] === undefined) {
                fetchNewsForSource(source, false);
            }
        });
    }, [sources, articles, fetchNewsForSource]);

    const refreshAllNews = useCallback(() => {
        sources.forEach(source => fetchNewsForSource(source, true));
    }, [sources, fetchNewsForSource]);

    const savedCallback = useRef(refreshAllNews);

    useEffect(() => { savedCallback.current = refreshAllNews; }, [refreshAllNews]);
    useEffect(() => {
        const intervalId = setInterval(() => savedCallback.current(), 3600 * 1000);
        return () => clearInterval(intervalId);
    }, []);
    
    if (sources.length === 0) {
        return (
             <div className="text-center py-10 border-2 border-dashed border-zinc-700 rounded-lg">
                <p className="text-zinc-400">No news sources added yet.</p>
                <p className="text-sm text-zinc-500">Use the form above to get the latest news.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="flex items-center gap-2 mb-3">
                    <TagIcon className="w-5 h-5 text-zinc-400"/>
                    <h3 className="text-lg font-semibold text-zinc-200">Filter by Topic</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setActiveFilters(new Set())} className={`px-3 py-1 text-sm rounded-full transition ${activeFilters.size === 0 ? 'bg-sky-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'}`}>
                        All Topics
                    </button>
                    {allTags.map(tag => (
                        <button key={tag} onClick={() => toggleFilter(tag)} className={`px-3 py-1 text-sm rounded-full transition ${activeFilters.has(tag) ? 'bg-sky-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'}`}>
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {filteredSources.map(source => (
                <div key={source.id}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-zinc-200">{new URL(source.url).hostname}</h3>
                        <button onClick={() => onRemoveSource(source.id)} className="text-zinc-500 hover:text-red-400 transition p-1">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                    {loadingSources[source.id] ? (
                        <div className="flex justify-center items-center h-24">
                           <div className="w-8 h-8 border-4 border-t-transparent border-sky-500 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(articles[source.id] || []).length > 0 ? (
                                (articles[source.id] || []).map((article, index) => (
                                <a key={index} href={article.link} target="_blank" rel="noopener noreferrer" className="group block bg-zinc-800 rounded-lg p-4 hover:bg-zinc-700/50 transition border border-zinc-700 hover:border-sky-500/50 space-y-2">
                                    <h4 className="font-bold text-sky-400 group-hover:text-sky-300 transition">{article.title}</h4>
                                    <p className="text-sm text-zinc-400">{article.summary}</p>
                                </a>
                            ))) : (
                                <p className="text-zinc-500 md:col-span-2 lg:col-span-3">Could not retrieve news from this source.</p>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};