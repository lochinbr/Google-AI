import React from 'react';
import { Repository } from '../types';
import { GitBranchIcon, UpdateIcon, CalendarIcon } from './icons';

interface InfoSidebarProps {
    repository: Repository | null;
}

export const InfoSidebar: React.FC<InfoSidebarProps> = ({ repository }) => {
    return (
        <aside className="lg:sticky lg:top-8">
            {repository ? (
                <div className="bg-zinc-800/50 p-6 rounded-lg border border-zinc-700">
                    <div className="flex items-center gap-4 mb-4">
                        <img src={repository.avatarUrl} alt={`${repository.fullName} avatar`} className="w-14 h-14 rounded-full border-2 border-zinc-600" />
                        <div>
                             <h3 className="text-xl font-bold text-zinc-100">{repository.fullName}</h3>
                             <div className="mt-1 flex items-center divide-x divide-zinc-600">
                                <a href={repository.url} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-400 hover:underline pr-3">View on GitHub</a>
                                <a href={`${repository.url}/releases`} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-400 hover:underline pl-3">All Releases</a>
                             </div>
                        </div>
                    </div>
                    
                    <h4 className="font-semibold text-zinc-300 border-b border-zinc-700 pb-2 mb-4 flex items-center gap-2">
                        <UpdateIcon className="w-5 h-5" />
                        Latest Release
                    </h4>

                    {repository.latestRelease ? (
                        <div className="space-y-4 text-sm">
                            <div className="flex items-start gap-3">
                                <GitBranchIcon className="w-5 h-5 text-zinc-400 mt-0.5"/>
                                <div>
                                    <p className="text-zinc-400">Version</p>
                                    <a href={repository.latestRelease.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-zinc-100 hover:text-sky-400 transition text-base">
                                        {repository.latestRelease.tagName}
                                    </a>
                                    {repository.latestRelease.name && repository.latestRelease.name !== repository.latestRelease.tagName && (
                                        <p className="text-zinc-300 mt-1">{repository.latestRelease.name}</p>
                                    )}
                                </div>
                            </div>
                             <div className="flex items-start gap-3">
                                <CalendarIcon className="w-5 h-5 text-zinc-400 mt-0.5"/>
                                <div>
                                    <p className="text-zinc-400">Published Date</p>
                                    <p className="font-semibold text-zinc-100">
                                        {new Date(repository.latestRelease.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-zinc-500 text-sm">No recent release information found.</p>
                    )}
                </div>
            ) : (
                <div className="bg-zinc-800/50 p-6 rounded-lg text-center border-2 border-dashed border-zinc-700">
                    <p className="text-zinc-400">Select a repository</p>
                    <p className="text-sm text-zinc-500">Click on a repository from the list to view its details here.</p>
                </div>
            )}
        </aside>
    );
};