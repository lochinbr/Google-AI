export interface Repository {
  id: number;
  fullName: string;
  url: string;
  description: string | null;
  avatarUrl: string;
  hasUpdate: boolean;
  latestRelease?: {
    name: string;
    tagName: string;
    publishedAt: string;
    url: string;
  };
}

export interface NewsSource {
  id: string;
  url: string;
  tags: string[];
}

export interface NewsArticle {
    title: string;
    summary: string;
    link: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface YouTubeTag {
  id: string;
  name: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
  description: string;
}

export enum AppTab {
  REPOSITORIES = 'REPOSITORIES',
  NEWS = 'NEWS',
  YOUTUBE = 'YOUTUBE',
}