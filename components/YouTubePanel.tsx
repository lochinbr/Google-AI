
import React, { useState, FormEvent, useCallback } from 'react';
import { YouTubeTag, YouTubeVideo } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { searchYouTubeVideos } from '../services/geminiService';
import { PlusIcon, TrashIcon, TagIcon, CloseIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

const SearchControl: React.FC<{
    label: string;
    options: { value: string, label: string }[];
    value: string;
    onChange: (value: any) => void;
}> = ({ label, options, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1">{label}</label>
        <div className="flex bg-zinc-700/50 rounded-md p-1">
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`flex-1 text-sm px-3 py-1.5 rounded-md transition ${value === opt.value ? 'bg-sky-600 text-white' : 'hover:bg-zinc-600/50 text-zinc-300'}`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    </div>
);

const VideoCard: React.FC<{ video: YouTubeVideo }> = ({ video }) => (
    <a href={video.url} target="_blank" rel="noopener noreferrer" className="group bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 hover:border-sky-500/50 transition-all duration-300 flex flex-col">
        <div className="relative aspect-video">
            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition"></div>
        </div>
        <div className="p-4 flex flex-col flex-grow">
            <h3 className="font-bold text-sky-400 group-hover:text-sky-300 transition line-clamp-2">{video.title}</h3>
            <p className="text-sm text-zinc-400 mt-1">{video.channelTitle}</p>
            <p className="text-xs text-zinc-500 mt-2 line-clamp-2 flex-grow">{video.description}</p>
            <p className="text-xs text-zinc-500 mt-2 text-right">{new Date(video.publishedAt).toLocaleDateString()}</p>
        </div>
    </a>
);


export const YouTubePanel: React.FC = () => {
    const [tags, setTags] = useLocalStorage<YouTubeTag[]>('youtubeTags', []);
    const [newTag, setNewTag] = useState('');
    
    const [videos, setVideos] = useState<YouTubeVideo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const [sortBy, setSortBy] = useState<'date' | 'relevance'>('date');
    const [timeFrame, setTimeFrame] = useState<'any' | 'day' | 'week' | 'month' | 'year'>('week');

    const handleAddTag = (e: FormEvent) => {
        e.preventDefault();
        const tagName = newTag.trim();
        if (tagName && !tags.some(t => t.name.toLowerCase() === tagName.toLowerCase())) {
            setTags(prev => [...prev, { id: Date.now().toString(), name: tagName }]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (id: string) => {
        setTags(prev => prev.filter(t => t.id !== id));
    };
    
    const executeSearch = useCallback(async (page: number) => {
        if (tags.length === 0) {
            setVideos([]);
            setHasSearched(true);
            return;
        }
        setError(null);
        setIsLoading(true);
        setHasSearched(true);
        try {
            const results = await searchYouTubeVideos({
                tags: tags.map(t => t.name),
                sortBy,
                timeFrame,
                page,
            });
            setVideos(results);
            setHasMore(results.length === 20);
            setCurrentPage(page);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
            setVideos([]);
        } finally {
            setIsLoading(false);
        }
    }, [tags, sortBy, timeFrame]);

    const handleSearch = () => {
        executeSearch(1);
    };
    
    const handleNextPage = () => {
        if (hasMore) {
            executeSearch(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            executeSearch(currentPage - 1);
        }
    };


    return (
        <div className="space-y-8">
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="flex items-center gap-2 mb-3">
                    <TagIcon className="w-5 h-5 text-zinc-400"/>
                    <h3 className="text-lg font-semibold text-zinc-200">Manage Your YouTube Tags</h3>
                </div>
                <p className="text-sm text-zinc-400 mb-4">Add tags for topics you want to discover videos about.</p>
                <form onSubmit={handleAddTag} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        placeholder="e.g. React, Rust, AI"
                        className="flex-grow bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
                    />
                    <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold p-2.5 rounded-md flex items-center justify-center disabled:bg-zinc-600 disabled:cursor-not-allowed transition" disabled={!newTag.trim()}>
                        <PlusIcon className="w-5 h-5"/>
                    </button>
                </form>
                <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                        <div key={tag.id} className="flex items-center gap-1.5 bg-zinc-700 text-zinc-200 text-sm px-3 py-1 rounded-full">
                            <span>{tag.name}</span>
                            <button onClick={() => handleRemoveTag(tag.id)} className="text-zinc-400 hover:text-white">
                                <CloseIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SearchControl label="Sort by" value={sortBy} onChange={setSortBy} options={[{ value: 'date', label: 'Newest' }, { value: 'relevance', label: 'Relevance' }]} />
                    <SearchControl label="Time frame" value={timeFrame} onChange={setTimeFrame} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'any', label: 'Any' }]} />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={isLoading || tags.length === 0}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-4 rounded-md flex items-center justify-center disabled:bg-zinc-600 disabled:cursor-not-allowed transition"
                >
                    {isLoading ? 'Searching...' : `Search Videos (${tags.length} tags)`}
                </button>
            </div>
            
            <div>
                <h2 className="text-xl font-semibold text-zinc-200 mb-4">Search Results</h2>
                {isLoading ? (
                     <div className="flex justify-center items-center py-20">
                         <div className="w-10 h-10 border-4 border-t-transparent border-sky-500 rounded-full animate-spin"></div>
                     </div>
                ) : error ? (
                    <div className="text-center py-10 border-2 border-dashed border-red-500/30 rounded-lg bg-red-500/10">
                        <p className="text-red-400 font-semibold">An Error Occurred</p>
                        <p className="text-red-400/80 mt-1 text-sm">{error}</p>
                    </div>
                ) : !hasSearched ? (
                    <div className="text-center py-20 border-2 border-dashed border-zinc-700 rounded-lg">
                        <p className="text-zinc-400">Your search results will appear here.</p>
                        <p className="text-sm text-zinc-500">Add some tags and click search to begin.</p>
                    </div>
                ) : videos.length > 0 ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {videos.map(video => <VideoCard key={video.id} video={video} />)}
                        </div>
                        <div className="flex justify-center items-center gap-4">
                            <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading} className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-200 px-4 py-2 rounded-md transition">
                                <ChevronLeftIcon className="w-5 h-5" />
                                Previous
                            </button>
                            <span className="text-zinc-400">Page {currentPage}</span>
                            <button onClick={handleNextPage} disabled={!hasMore || isLoading} className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-200 px-4 py-2 rounded-md transition">
                                Next
                                <ChevronRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed border-zinc-700 rounded-lg">
                        <p className="text-zinc-400">No videos found for the selected tags.</p>
                        <p className="text-sm text-zinc-500">Try adjusting your tags or search filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};