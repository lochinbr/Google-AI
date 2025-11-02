import React, { useState, useMemo } from 'react';
import { Repository, NewsSource, AppTab } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { AddRepositoryForm, RepositoryList } from './components/RepositoryPanels';
import { AddNewsSourceForm, NewsDisplay } from './components/NewsPanel';
import { YouTubePanel } from './components/YouTubePanel';
import { ChatWidget } from './components/ChatWidget';
import { InfoSidebar } from './components/InfoSidebar';

const App: React.FC = () => {
    const [repositories, setRepositories] = useLocalStorage<Repository[]>('repositories', []);
    const [newsSources, setNewsSources] = useLocalStorage<NewsSource[]>('newsSources', []);
    const [activeTab, setActiveTab] = useState<AppTab>(AppTab.REPOSITORIES);
    const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);

    const handleAddRepo = (repo: Repository) => {
        setRepositories(prev => [repo, ...prev]);
    };

    const handleAddNewsSource = (source: NewsSource) => {
        setNewsSources(prev => [source, ...prev]);
    };

    const handleRemoveNewsSource = (id: string) => {
        setNewsSources(prev => prev.filter(s => s.id !== id));
    };

    const selectedRepo = useMemo(() => {
        return repositories.find(repo => repo.id === selectedRepoId) || null;
    }, [repositories, selectedRepoId]);
    
    const handleTabChange = (tab: AppTab) => {
        setActiveTab(tab);
        if (tab === AppTab.NEWS || tab === AppTab.YOUTUBE) {
            setSelectedRepoId(null);
        }
    }

    const TabButton: React.FC<{tab: AppTab; label: string}> = ({ tab, label }) => (
        <button
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 text-base font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 focus-visible:ring-sky-500 rounded-md ${
                activeTab === tab 
                ? 'bg-zinc-800 text-sky-400' 
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
        >
            {label}
        </button>
    );

    const showSidebar = activeTab === AppTab.REPOSITORIES && repositories.length > 0;

    return (
        <div className="min-h-screen bg-zinc-900 text-zinc-200 font-sans">
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-900 to-sky-900/20 z-0"></div>
            <div className="relative z-10 container mx-auto p-4 md:p-8">
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                        Update Tracker & AI Assistant
                    </h1>
                    <p className="text-zinc-400 mt-2 max-w-2xl mx-auto">
                        Stay informed with the latest GitHub updates, news, and videos, all in one place.
                    </p>
                </header>

                <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start`}>
                    <div className={showSidebar ? "lg:col-span-8" : "lg:col-span-12"}>
                        <div className="flex flex-wrap space-x-2 p-1.5 bg-zinc-900/50 rounded-lg border border-zinc-700 mb-4 max-w-lg">
                            <TabButton tab={AppTab.REPOSITORIES} label="GitHub Repositories" />
                            <TabButton tab={AppTab.NEWS} label="News" />
                            <TabButton tab={AppTab.YOUTUBE} label="YouTube" />
                        </div>

                        <main className="bg-zinc-800/50 p-6 rounded-lg border border-zinc-700">
                            {activeTab === AppTab.REPOSITORIES && (
                                <div>
                                    <AddRepositoryForm onAddRepo={handleAddRepo} repositories={repositories} />
                                    <RepositoryList 
                                        repositories={repositories} 
                                        setRepositories={setRepositories}
                                        selectedRepoId={selectedRepoId}
                                        onSelectRepo={setSelectedRepoId}
                                    />
                                </div>
                            )}
                            {activeTab === AppTab.NEWS && (
                                <div>
                                    <AddNewsSourceForm onAddSource={handleAddNewsSource} sources={newsSources} />
                                    <NewsDisplay sources={newsSources} onRemoveSource={handleRemoveNewsSource} />
                                </div>
                            )}
                            {activeTab === AppTab.YOUTUBE && (
                                <YouTubePanel />
                            )}
                        </main>
                    </div>

                    {showSidebar && (
                        <div className="lg:col-span-4 w-full">
                            <InfoSidebar repository={selectedRepo} />
                        </div>
                    )}
                </div>
            </div>
            <ChatWidget />
        </div>
    );
};

export default App;