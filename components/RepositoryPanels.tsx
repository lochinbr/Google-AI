import React, { useState, FormEvent, useEffect, useCallback, useRef } from 'react';
import { Repository } from '../types';
import { fetchRepoDetails, parseRepoUrl, checkRepositoryUpdate } from '../services/githubService';
import { PlusIcon, TrashIcon, CheckIcon, UpdateIcon } from './icons';

interface AddRepositoryFormProps {
    onAddRepo: (repo: Repository) => void;
    repositories: Repository[];
}

export const AddRepositoryForm: React.FC<AddRepositoryFormProps> = ({ onAddRepo, repositories }) => {
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const parsed = parseRepoUrl(url);
        if (!parsed) {
            setError('Invalid GitHub repository URL.');
            setIsLoading(false);
            return;
        }

        if (repositories.some(r => r.fullName === `${parsed.owner}/${parsed.repo}`)) {
            setError('Repository already added.');
            setIsLoading(false);
            return;
        }

        try {
            const details = await fetchRepoDetails(parsed.owner, parsed.repo);
            const newRepo: Repository = {
                id: details.id,
                fullName: details.full_name,
                url: details.html_url,
                description: details.description,
                avatarUrl: details.owner.avatar_url,
                hasUpdate: false,
            };
            onAddRepo(newRepo);
            setUrl('');
        } catch (err) {
            setError('Could not fetch repository. Please check the URL and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-zinc-800/50 rounded-lg mb-8 border border-zinc-700">
            <label htmlFor="repo-url" className="block text-sm font-medium text-zinc-300 mb-2">
                GitHub Repository URL
            </label>
            <div className="flex gap-2">
                <input
                    id="repo-url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://github.com/netbirdio/netbird"
                    className="flex-grow bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center disabled:bg-zinc-600 disabled:cursor-not-allowed transition"
                    disabled={isLoading || !url}
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


interface RepositoryItemProps {
    repo: Repository;
    onMarkAsSeen: (id: number) => void;
    onRemove: (id: number) => void;
    isSelected: boolean;
    onSelect: (id: number) => void;
}

const RepositoryItem: React.FC<RepositoryItemProps> = ({ repo, onMarkAsSeen, onRemove, isSelected, onSelect }) => {
    const updateGradient = 'bg-gradient-to-tr from-emerald-500/10 to-teal-500/10';
    const borderGradient = 'bg-gradient-to-r from-emerald-500 to-teal-400';

    const handleRemoveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove(repo.id);
    };
    
    const handleMarkAsSeenClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onMarkAsSeen(repo.id);
    }

    return (
        <div 
            onClick={() => onSelect(repo.id)}
            className={`relative bg-zinc-800 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-sky-900/50 cursor-pointer group
            ${repo.hasUpdate ? updateGradient : ''}
            ${isSelected ? 'ring-2 ring-sky-500' : 'ring-1 ring-zinc-700 hover:ring-sky-600'}`}
        >
            {repo.hasUpdate && <div className={`absolute top-0 left-0 h-full w-1.5 ${borderGradient}`}></div>}
            <div className={`p-4 ${repo.hasUpdate ? 'ml-1.5' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <img src={repo.avatarUrl} alt={`${repo.fullName} avatar`} className="w-12 h-12 rounded-full border-2 border-zinc-700" />
                        <div className="min-w-0">
                            <p className="text-lg font-bold text-sky-400 group-hover:text-sky-300 transition truncate">{repo.fullName}</p>
                            <p className="text-sm text-zinc-400 mt-1 truncate">{repo.description}</p>
                        </div>
                    </div>
                    <button onClick={handleRemoveClick} className="text-zinc-500 hover:text-red-400 transition p-1 flex-shrink-0">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>

                {repo.hasUpdate && (
                    <div className="mt-4 flex justify-between items-center p-3 bg-zinc-900/50 rounded-md border border-zinc-700">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <UpdateIcon className="w-5 h-5"/>
                            <span className="font-semibold">New Update Available!</span>
                        </div>
                        <button onClick={handleMarkAsSeenClick} className="flex items-center gap-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-1.5 rounded-md transition">
                            <CheckIcon className="w-4 h-4"/>
                            Mark as Seen
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


interface RepositoryListProps {
    repositories: Repository[];
    setRepositories: React.Dispatch<React.SetStateAction<Repository[]>>;
    selectedRepoId: number | null;
    onSelectRepo: (id: number) => void;
}

export const RepositoryList: React.FC<RepositoryListProps> = ({ repositories, setRepositories, selectedRepoId, onSelectRepo }) => {
    const [isChecking, setIsChecking] = useState(true);

    const handleMarkAsSeen = (id: number) => {
        setRepositories(prev => prev.map(r => r.id === id ? { ...r, hasUpdate: false } : r));
    };

    const handleRemove = (id: number) => {
        setRepositories(prev => prev.filter(r => r.id !== id));
    };

    const runUpdateCheck = useCallback(async () => {
        if (repositories.length === 0) {
            setIsChecking(false);
            return;
        }

        setIsChecking(true);

        try {
            const checkPromises = repositories.map(checkRepositoryUpdate);
            const checkedRepos = await Promise.all(checkPromises);
            
            const checkedMap = new Map(checkedRepos.map(r => [r.id, r]));
            
            setRepositories(prevRepos => 
                prevRepos.map(repo => checkedMap.get(repo.id) || repo)
            );

        } catch (error) {
            console.error("Error during repository update check:", error);
        } finally {
            setIsChecking(false);
        }
    }, [repositories, setRepositories]);

    const savedCallback = useRef(runUpdateCheck);

    useEffect(() => {
        savedCallback.current = runUpdateCheck;
    }, [runUpdateCheck]);

    useEffect(() => {
        const tick = () => savedCallback.current();
        tick(); 
        
        const intervalId = setInterval(tick, 3600 * 1000);
        return () => clearInterval(intervalId);
    }, []);


    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-zinc-200">Tracked Repositories</h2>
                <button onClick={() => savedCallback.current()} disabled={isChecking} className="flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 disabled:text-zinc-500 disabled:cursor-wait transition">
                     {isChecking ? (
                        <>
                        <div className="w-4 h-4 border-2 border-t-transparent border-zinc-500 rounded-full animate-spin"></div>
                        <span>Checking...</span>
                        </>
                    ) : (
                        <>
                        <UpdateIcon className="w-4 h-4"/>
                        <span>Check for updates</span>
                        </>
                    )}
                </button>
            </div>
            {repositories.length === 0 && !isChecking ? (
                <div className="text-center py-10 border-2 border-dashed border-zinc-700 rounded-lg">
                    <p className="text-zinc-400">No repositories added yet.</p>
                    <p className="text-sm text-zinc-500">Use the form above to start tracking.</p>
                </div>
            ) : (
                 <div className="space-y-4">
                    {repositories.map(repo => (
                        <RepositoryItem 
                            key={repo.id} 
                            repo={repo} 
                            onMarkAsSeen={handleMarkAsSeen} 
                            onRemove={handleRemove}
                            isSelected={selectedRepoId === repo.id}
                            onSelect={onSelectRepo}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};