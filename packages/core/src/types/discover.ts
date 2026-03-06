import type { Source } from './skill';

/** Discover result */
export interface DiscoverResult {
  skills: DiscoveredSkill[];
  total: number;
  page: number;
  hasMore: boolean;
}

/** Discovered skill */
export interface DiscoveredSkill {
  name: string;
  description: string;
  author: string;
  source: Source;
  stars?: number;
  downloads?: number;
  tags: string[];
  safetyRating: 'safe' | 'caution' | 'warning';
}
