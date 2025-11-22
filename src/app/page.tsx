/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import { ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';

// 客户端收藏 API
import {
  type Favorite,
  clearAllFavorites,
  getAllFavorites,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { getDoubanCategories } from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';

import CapsuleSwitch from '@/components/CapsuleSwitch';
import ContinueWatching from '@/components/ContinueWatching';
import PageLayout from '@/components/PageLayout';
import { useSite } from '@/components/SiteProvider';
import VideoCard from '@/components/VideoCard';

// 自定义防抖Hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

function HomeClient() {
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  const [hotMovies, setHotMovies] = useState<DoubanItem[]>([]);
  const [hotTvShows, setHotTvShows] = useState<DoubanItem[]>([]);
  const [hotVarietyShows, setHotVarietyShows] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { announcement } = useSite();
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const router = useRouter();

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // 搜索处理函数
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim().replace(/\s+/g, ' ');
    if (!trimmedQuery) return;

    // 跳转到搜索页面
    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  }, [searchQuery, router]);

  // 搜索框组件
  const SearchBar = () => {
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

    // 同步本地状态与父组件状态
    useEffect(() => {
      setLocalSearchQuery(searchQuery);
    }, [searchQuery]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setSearchQuery(localSearchQuery);
      handleSearch(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit(e);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="搜索电影、剧集、综艺..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm 
                     placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                     dark:bg-gray-800/80 dark:border-gray-600 dark:text-white dark:placeholder-gray-400
                     transition-all duration-200 text-lg"
          />
          <button 
            type="submit"
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-purple-50 rounded-r-xl transition-colors dark:hover:bg-purple-900/20"
            aria-label="搜索"
          >
            <Search className="h-5 w-5 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300" />
          </button>
        </div>
      </form>
    );
  };

  // 检查公告弹窗状态
  useEffect(() => {
    if (typeof window !== 'undefined' && announcement) {
      const hasSeenAnnouncement = localStorage.getItem('hasSeenAnnouncement');
      if (hasSeenAnnouncement !== announcement) {
        setShowAnnouncement(true);
      } else {
        setShowAnnouncement(Boolean(!hasSeenAnnouncement && announcement));
      }
    }
  }, [announcement]);

  // 收藏夹数据
  type FavoriteItem = {
    id: string;
    source: string;
    title: string;
    poster: string;
    episodes: number;
    source_name: string;
    currentEpisode?: number;
    search_title?: string;
  };

  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    const fetchDoubanData = async () => {
      try {
        setLoading(true);

        const [moviesData, tvShowsData, varietyShowsData] = await Promise.all([
          getDoubanCategories({
            kind: 'movie',
            category: '热门',
            type: '全部',
          }),
          getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv' }),
          getDoubanCategories({ kind: 'tv', category: 'show', type: 'show' }),
        ]);

        if (moviesData.code === 200) {
          setHotMovies(moviesData.list);
        }
        if (tvShowsData.code === 200) {
          setHotTvShows(tvShowsData.list);
        }
        if (varietyShowsData.code === 200) {
          setHotVarietyShows(varietyShowsData.list);
        }
      } catch (error) {
        // 静默处理错误
      } finally {
        setLoading(false);
      }
    };

    fetchDoubanData();
  }, []);

  // ... 其余现有代码保持不变（处理收藏数据、过滤逻辑等）

  // 返回的JSX中，将原来的SearchBar替换为新的带表单的SearchBar
  return (
    <PageLayout>
      <div className='px-4 sm:px-8 lg:px-12 py-4 sm:py-8 overflow-visible'>
        {/* 搜索栏 - 现在具有实际搜索功能 */}
        <SearchBar />

        {/* 其余现有代码保持不变 */}
        {/* ... */}
      </div>
    </PageLayout>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  );
}
