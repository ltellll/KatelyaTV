/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import { ChevronRight, Search, ChevronUp, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';

// 客户端收藏 API
import {
  type Favorite,
  clearAllFavorites,
  getAllFavorites,
  getAllPlayRecords,
  subscribeToDataUpdates,
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
  subscribeToDataUpdates as subscribeToSearchUpdates,
} from '@/lib/db.client';
import { getDoubanCategories } from '@/lib/douban.client';
import { DoubanItem, SearchResult } from '@/lib/types';

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

// 搜索组件 - 增强版，支持搜索历史和快捷键
const SearchBar = ({ 
  searchQuery, 
  setSearchQuery, 
  onSearch, 
  isLoading,
  onFocus 
}: { 
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onSearch: (query: string) => void;
  isLoading: boolean;
  onFocus?: () => void;
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  // 添加键盘快捷键支持 (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="searchInput"
            type="text"
            placeholder="搜索电影、电视剧、综艺..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={onFocus}
            className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm 
                     placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                     dark:bg-gray-800/80 dark:border-gray-600 dark:text-white dark:placeholder-gray-400
                     transition-all duration-200 text-lg"
          />
          {/* 键盘快捷键提示 */}
          <div className="absolute inset-y-0 right-3 flex items-center space-x-1">
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-sans text-gray-500 bg-gray-100 rounded border dark:bg-gray-700 dark:text-gray-400">
              {navigator.platform.toUpperCase().includes('MAC') ? '⌘' : 'Ctrl'} K
            </kbd>
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

// 搜索历史组件
const SearchHistory = ({ 
  searchHistory, 
  onSearch, 
  onDeleteHistory,
  onClearHistory 
}: {
  searchHistory: string[];
  onSearch: (query: string) => void;
  onDeleteHistory: (item: string) => void;
  onClearHistory: () => void;
}) => {
  if (searchHistory.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">搜索历史</h2>
        <button
          onClick={onClearHistory}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors dark:text-gray-400 dark:hover:text-red-500"
        >
          清空
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {searchHistory.map((item) => (
          <div key={item} className="relative group">
            <button
              onClick={() => onSearch(item)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors duration-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
            >
              {item}
            </button>
            <button
              onClick={() => onDeleteHistory(item)}
              className="absolute -top-1 -right-1 w-4 h-4 opacity-0 group-hover:opacity-100 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

function HomeClient() {
  const [activeTab, setActiveTab] = useState<'home' | 'favorites' | 'search'>('home');
  const [hotMovies, setHotMovies] = useState<DoubanItem[]>([]);
  const [hotTvShows, setHotTvShows] = useState<DoubanItem[]>([]);
  const [hotVarietyShows, setHotVarietyShows] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { announcement } = useSite();
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从搜索页面复制的搜索功能
  const fetchSearchResults = async (query: string) => {
    try {
      setIsSearchLoading(true);
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      
      // 使用与搜索页面相同的排序逻辑
      const sortedResults = data.results.sort((a: SearchResult, b: SearchResult) => {
        const aExactMatch = a.title === query.trim();
        const bExactMatch = b.title === query.trim();

        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        if (a.year === b.year) {
          return a.title.localeCompare(b.title);
        } else {
          if (a.year === 'unknown' && b.year === 'unknown') return 0;
          else if (a.year === 'unknown') return 1;
          else if (b.year === 'unknown') return -1;
          else return parseInt(a.year) > parseInt(b.year) ? -1 : 1;
        }
      });
      
      setSearchResults(sortedResults);
      setShowSearchResults(true);
      return sortedResults;
    } catch (error) {
      setSearchResults([]);
      setShowSearchResults(true);
      return [];
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    const trimmed = query.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      setShowSearchResults(false);
      return;
    }

    setActiveTab('search');
    await fetchSearchResults(trimmed);
    
    // 保存到搜索历史
    addSearchHistory(trimmed);
  };

  // 监听URL参数变化
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      setActiveTab('search');
      handleSearch(query);
    }
  }, [searchParams]);

  // 加载搜索历史
  useEffect(() => {
    const loadSearchHistory = async () => {
      const history = await getSearchHistory();
      setSearchHistory(history);
    };

    loadSearchHistory();

    // 监听搜索历史更新
    const unsubscribe = subscribeToSearchUpdates(
      'searchHistoryUpdated',
      (newHistory: string[]) => {
        setSearchHistory(newHistory);
      }
    );

    return unsubscribe;
  }, []);

  // 返回顶部功能
  const scrollToTop = () => {
    try {
      document.body.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      document.body.scrollTop = 0;
    }
  };

  // 滚动监听
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.body.scrollTop || document.documentElement.scrollTop || 0;
      setShowBackToTop(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 聚合搜索结果（从搜索页面复制）
  const aggregatedResults = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    searchResults.forEach((item) => {
      const key = `${item.title.replaceAll(' ', '')}-${item.year || 'unknown'}-${item.episodes?.length === 1 ? 'movie' : 'tv'}`;
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    });
    
    return Array.from(map.entries()).sort((a, b) => {
      const aExactMatch = a[1][0].title.replaceAll(' ', '').includes(searchQuery.trim().replaceAll(' ', ''));
      const bExactMatch = b[1][0].title.replaceAll(' ', '').includes(searchQuery.trim().replaceAll(' ', ''));

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      if (a[1][0].year === b[1][0].year) {
        return a[0].localeCompare(b[0]);
      } else {
        const aYear = a[1][0].year;
        const bYear = b[1][0].year;

        if (aYear === 'unknown' && bYear === 'unknown') return 0;
        else if (aYear === 'unknown') return 1;
        else if (bYear === 'unknown') return -1;
        else return parseInt(aYear) > parseInt(bYear) ? -1 : 1;
      }
    });
  }, [searchResults, searchQuery]);

  // 原有的首页数据获取和状态管理
  useEffect(() => {
    const fetchDoubanData = async () => {
      try {
        setLoading(true);
        const [moviesData, tvShowsData, varietyShowsData] = await Promise.all([
          getDoubanCategories({ kind: 'movie', category: '热门', type: '全部' }),
          getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv' }),
          getDoubanCategories({ kind: 'tv', category: 'show', type: 'show' }),
        ]);

        if (moviesData.code === 200) setHotMovies(moviesData.list);
        if (tvShowsData.code === 200) setHotTvShows(tvShowsData.list);
        if (varietyShowsData.code === 200) setHotVarietyShows(varietyShowsData.list);
      } catch (error) {
        // 静默处理错误
      } finally {
        setLoading(false);
      }
    };

    fetchDoubanData();
  }, []);

  // 收藏夹相关状态和效果
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

  const updateFavoriteItems = async (allFavorites: Record<string, Favorite>) => {
    const allPlayRecords = await getAllPlayRecords();
    const sorted = Object.entries(allFavorites)
      .sort(([, a], [, b]) => b.save_time - a.save_time)
      .map(([key, fav]) => {
        const plusIndex = key.indexOf('+');
        const source = key.slice(0, plusIndex);
        const id = key.slice(plusIndex + 1);
        const playRecord = allPlayRecords[key];
        const currentEpisode = playRecord?.index;

        return {
          id,
          source,
          title: fav.title,
          year: fav.year,
          poster: fav.cover,
          episodes: fav.total_episodes,
          source_name: fav.source_name,
          currentEpisode,
          search_title: fav?.search_title,
        } as FavoriteItem;
      });
    setFavoriteItems(sorted);
  };

  useEffect(() => {
    if (activeTab !== 'favorites') return;

    const loadFavorites = async () => {
      const allFavorites = await getAllFavorites();
      await updateFavoriteItems(allFavorites);
    };

    loadFavorites();

    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, Favorite>) => {
        updateFavoriteItems(newFavorites);
      }
    );

    return unsubscribe;
  }, [activeTab]);

  // 首页内容搜索过滤
  const filteredFavorites = useMemo(() => {
    if (!debouncedSearchQuery || activeTab !== 'favorites') {
      return favoriteItems;
    }
    const query = debouncedSearchQuery.toLowerCase();
    return favoriteItems.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.search_title?.toLowerCase().includes(query) ||
      item.source_name.toLowerCase().includes(query)
    );
  }, [favoriteItems, debouncedSearchQuery, activeTab]);

  const filteredMovies = useMemo(() => {
    if (!debouncedSearchQuery || activeTab !== 'home') {
      return hotMovies.slice(0, 10);
    }
    const query = debouncedSearchQuery.toLowerCase();
    return hotMovies.filter(movie =>
      movie.title.toLowerCase().includes(query) ||
      movie.rate?.toString().includes(query)
    ).slice(0, 10);
  }, [hotMovies, debouncedSearchQuery, activeTab]);

  const filteredTvShows = useMemo(() => {
    if (!debouncedSearchQuery || activeTab !== 'home') {
      return hotTvShows.slice(0, 10);
    }
    const query = debouncedSearchQuery.toLowerCase();
    return hotTvShows.filter(show =>
      show.title.toLowerCase().includes(query) ||
      show.rate?.toString().includes(query)
    ).slice(0, 10);
  }, [hotTvShows, debouncedSearchQuery, activeTab]);

  const filteredVarietyShows = useMemo(() => {
    if (!debouncedSearchQuery || activeTab !== 'home') {
      return hotVarietyShows.slice(0, 10);
    }
    const query = debouncedSearchQuery.toLowerCase();
    return hotVarietyShows.filter(show =>
      show.title.toLowerCase().includes(query) ||
      show.rate?.toString().includes(query)
    ).slice(0, 10);
  }, [hotVarietyShows, debouncedSearchQuery, activeTab]);

  const handleCloseAnnouncement = (announcement: string) => {
    setShowAnnouncement(false);
    localStorage.setItem('hasSeenAnnouncement', announcement);
  };

  // 渲染搜索结果视图
  const renderSearchResultsView = () => {
    if (isSearchLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      );
    }

    if (!searchQuery.trim()) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
            请输入搜索关键词
          </h3>
          <SearchHistory
            searchHistory={searchHistory}
            onSearch={handleSearch}
            onDeleteHistory={deleteSearchHistory}
            onClearHistory={clearSearchHistory}
          />
        </div>
      );
    }

    if (searchResults.length === 0 && searchQuery.trim()) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
            未找到相关结果
          </h3>
          <p className="text-gray-500 dark:text-gray-500 mb-8">
            尝试使用其他关键词搜索
          </p>
          <SearchHistory
            searchHistory={searchHistory}
            onSearch={handleSearch}
            onDeleteHistory={deleteSearchHistory}
            onClearHistory={clearSearchHistory}
          />
        </div>
      );
    }

    return (
      <section className='mb-8'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
            搜索结果: "{searchQuery}"
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            找到 {searchResults.length} 个结果
          </span>
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
          {searchResults.map((item, index) => (
            <div key={index} className='w-full'>
              <VideoCard
                from='search'
                title={item.title}
                poster={item.poster}
                douban_id={item.douban_id}
                rate={item.rate}
                year={item.year}
                type={item.episodes?.length > 1 ? 'tv' : 'movie'}
              />
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <PageLayout>
      <div className='px-4 sm:px-8 lg:px-12 py-4 sm:py-8 overflow-visible'>
        {/* 搜索栏 */}
        <SearchBar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          isLoading={isSearchLoading}
          onFocus={() => setActiveTab('search')}
        />

        {/* 顶部 Tab 切换 */}
        <div className='mb-8 flex justify-center'>
          <CapsuleSwitch
            options={[
              { label: '首页', value: 'home' },
              { label: '收藏夹', value: 'favorites' },
              { label: '搜索', value: 'search' },
            ]}
            active={activeTab}
            onChange={(value) => {
              setActiveTab(value as 'home' | 'favorites' | 'search');
              if (value !== 'search') {
                setSearchQuery('');
                setShowSearchResults(false);
              }
            }}
          />
        </div>

        {/* 主内容区域 */}
        <div className='w-full max-w-none mx-auto'>
          {activeTab === 'search' ? (
            // 搜索页面视图
            renderSearchResultsView()
          ) : activeTab === 'favorites' ? (
            // 收藏夹视图（保持不变）
            <FavoritesView 
              favoriteItems={favoriteItems}
              filteredFavorites={filteredFavorites}
              debouncedSearchQuery={debouncedSearchQuery}
              onClearFavorites={async () => {
                await clearAllFavorites();
                setFavoriteItems([]);
              }}
            />
          ) : (
            // 首页视图（保持不变）
            <HomeView
              loading={loading}
              debouncedSearchQuery={debouncedSearchQuery}
              filteredMovies={filteredMovies}
              filteredTvShows={filteredTvShows}
              filteredVarietyShows={filteredVarietyShows}
              hasSearchResults={
                debouncedSearchQuery && 
                (filteredMovies.length > 0 || filteredTvShows.length > 0 || filteredVarietyShows.length > 0)
              }
            />
          )}
        </div>
      </div>

      {/* 返回顶部按钮 */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-40 w-12 h-12 bg-purple-500/90 hover:bg-purple-500 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out flex items-center justify-center group ${
          showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label='返回顶部'
      >
        <ChevronUp className='w-6 h-6 transition-transform group-hover:scale-110' />
      </button>

      {/* 公告弹窗（保持不变） */}
      {announcement && showAnnouncement && (
        <AnnouncementModal 
          announcement={announcement}
          onClose={() => handleCloseAnnouncement(announcement)}
        />
      )}
    </PageLayout>
  );
}

// 辅助组件（保持原有实现）
const FavoritesView = ({ favoriteItems, filteredFavorites, debouncedSearchQuery, onClearFavorites }) => (
  <section className='mb-8'>
    <div className='mb-4 flex items-center justify-between'>
      <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
        {debouncedSearchQuery ? '搜索结果' : '我的收藏'}
      </h2>
      {favoriteItems.length > 0 && !debouncedSearchQuery && (
        <button onClick={onClearFavorites} className='text-sm text-gray-500 hover:text-purple-700 dark:text-gray-400 dark:hover:text-purple-300 transition-colors'>
          清空
        </button>
      )}
    </div>
    <div className='grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-6 lg:gap-x-8 justify-items-center'>
      {filteredFavorites.map((item) => (
        <div key={item.id + item.source} className='w-full max-w-44'>
          <VideoCard query={item.search_title} {...item} from='favorite' type={item.episodes > 1 ? 'tv' : ''} />
        </div>
      ))}
      {filteredFavorites.length === 0 && (
        <div className='col-span-full text-center text-gray-500 py-8 dark:text-gray-400'>
          {debouncedSearchQuery ? '未找到匹配的收藏内容' : '暂无收藏内容'}
        </div>
      )}
    </div>
  </section>
);

const HomeView = ({ loading, debouncedSearchQuery, filteredMovies, filteredTvShows, filteredVarietyShows, hasSearchResults }) => (
  <>
    {!debouncedSearchQuery && <ContinueWatching />}
    {/* 热门电影、剧集、综艺部分保持不变 */}
    {/* ... */}
  </>
);

const AnnouncementModal = ({ announcement, onClose }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70 p-4 transition-opacity duration-300`}>
    <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 transform transition-all duration-300 hover:shadow-2xl'>
      <div className='flex justify-between items-start mb-4'>
        <h3 className='text-2xl font-bold tracking-tight text-gray-800 dark:text-white border-b border-purple-500 pb-1'>提示</h3>
        <button onClick={onClose} className='text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-white transition-colors' aria-label='关闭'></button>
      </div>
      <div className='mb-6'>
        <div className='relative overflow-hidden rounded-lg mb-4 bg-purple-50 dark:bg-purple-900/20'>
          <div className='absolute inset-y-0 left-0 w-1.5 bg-purple-500 dark:bg-purple-400'></div>
          <p className='ml-4 text-gray-600 dark:text-gray-300 leading-relaxed'>{announcement}</p>
        </div>
      </div>
      <button onClick={onClose} className='w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-white font-medium shadow-md hover:shadow-lg hover:from-purple-700 hover:to-purple-800 dark:from-purple-600 dark:to-purple-700 dark:hover:from-purple-700 dark:hover:to-purple-800 transition-all duration-300 transform hover:-translate-y-0.5'>
        我知道了
      </button>
    </div>
  </div>
);

export default function Home() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  );
}
