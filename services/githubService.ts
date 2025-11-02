
import { Repository } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

export const parseRepoUrl = (url: string): { owner: string; repo: string } | null => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'github.com') {
      return null;
    }
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return { owner: pathParts[0], repo: pathParts[1] };
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const fetchRepoDetails = async (owner: string, repo: string): Promise<any> => {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`);
  if (!response.ok) {
    throw new Error('Failed to fetch repository details.');
  }
  return response.json();
};

export const fetchLatestRelease = async (owner: string, repo: string): Promise<any> => {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/releases`);
   if (!response.ok) {
    throw new Error('Failed to fetch repository releases.');
  }
  const releases = await response.json();
  return releases.length > 0 ? releases[0] : null;
};

export const checkRepositoryUpdate = async (repository: Repository): Promise<Repository> => {
    const parsed = parseRepoUrl(repository.url);
    if (!parsed) return repository;

    try {
        const latestRelease = await fetchLatestRelease(parsed.owner, parsed.repo);
        if (latestRelease) {
            const releaseDate = new Date(latestRelease.published_at);
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const hasUpdate = releaseDate > threeDaysAgo;
            
            return {
                ...repository,
                hasUpdate,
                latestRelease: {
                    name: latestRelease.name,
                    tagName: latestRelease.tag_name,
                    publishedAt: latestRelease.published_at,
                    url: latestRelease.html_url,
                },
            };
        }
        return { ...repository, hasUpdate: false };
    } catch (error) {
        console.error(`Failed to check updates for ${repository.fullName}`, error);
        return { ...repository, hasUpdate: false };
    }
};