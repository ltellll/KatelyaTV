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

// 搜索组件
const SearchBar = ({ searchQuery, setSearchQuery }: { searchQuery: string; setSearchQuery: (query: string) => void }) => {
  const router = useRouter();
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // 同步本地状态与父组件状态
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = localSearchQuery.trim().replace(/\s+/g, ' ');
    if (!trimmedQuery) return;

    setSearchQuery(trimmedQuery);
    
    // 跳转到搜索页面
    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
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

// KatelyaTV 底部 Logo 组件
const BottomKatelyaLogo = () => {
  return (
    <div className='bottom-logo-container'>
      {/* 浮动几何形状装饰 */}
      <div className='floating-shapes'>
        <div className='shape'></div>
        <div className='shape'></div>
        <div className='shape'></div>
        <div className='shape'></div>
      </div>

      <div className='text-center'>
        <div className='bottom-logo'>浅色TV在线免费搜索观看观看平台</div>
        <div className='mt-2 text-sm text-gray-500 dark:text-gray-400 opacity-75'>
          Powered by 浅色TV Core
        </div>
      </div>
    </div>
  );
};

function HomeClient() {
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  const [hotMovies, setHotMovies] = useState<DoubanItem[]>([]);
  const [hotTvShows, setHotTvShows] = useState<DoubanItem[]>([]);
  const [hotVarietyShows, setHotVarietyShows] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { announcement } = useSite();

  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

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

        // 并行获取热门电影、热门剧集和热门综艺
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
        // 静默处理错误，避免控制台警告
        // console.error('获取豆瓣数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoubanData();
  }, []);

  // 处理收藏数据更新的函数
  const updateFavoriteItems = async (allFavorites: Record<string, Favorite>) => {
    const allPlayRecords = await getAllPlayRecords();

    // 根据保存时间排序（从近到远）
    const sorted = Object.entries(allFavorites)
      .sort(([, a], [, b]) => b.save_time - a.save_time)
      .map(([key, fav]) => {
        const plusIndex = key.indexOf('+');
        const source = key.slice(0, plusIndex);
        const id = key.slice(plusIndex + 1);

        // 查找对应的播放记录，获取当前集数
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

  // 当切换到收藏夹时加载收藏数据
  useEffect(() => {
    if (activeTab !== 'favorites') return;

    const loadFavorites = async () => {
      const allFavorites = await getAllFavorites();
      await updateFavoriteItems(allFavorites);
    };

    loadFavorites();

    // 监听收藏更新事件
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, Favorite>) => {
        updateFavoriteItems(newFavorites);
      }
    );

    return unsubscribe;
  }, [activeTab]);

  // 搜索功能实现
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
    localStorage.setItem('hasSeenAnnouncement', announcement); // 记录已查看弹窗
  };

  const hasSearchResults = debouncedSearchQuery && (
    (activeTab === 'favorites' && filteredFavorites.length > 0) ||
    (activeTab === 'home' && (
      filteredMovies.length > 0 ||
      filteredTvShows.length > 0 ||
      filteredVarietyShows.length > 0
    ))
  );

  return (
    <PageLayout>
      <div className='px-4 sm:px-8 lg:px-12 py-4 sm:py-8 overflow-visible'>
        {/* 搜索栏 - 保持在顶部位置 */}
        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        {/* 顶部 Tab 切换 */}
        <div className='mb-8 flex justify-center'>
          <CapsuleSwitch
            options={[
              { label: '首页', value: 'home' },
              { label: '收藏夹', value: 'favorites' },
            ]}
            active={activeTab}
            onChange={(value) => {
              setActiveTab(value as 'home' | 'favorites');
              setSearchQuery(''); // 切换tab时清空搜索
            }}
          />
        </div>

        {/* 搜索状态显示 */}
        {debouncedSearchQuery && (
          <div className="text-center mb-6">
            <p className="text-gray-600 dark:text-gray-300">
              搜索关键词: <span className="font-semibold text-purple-600 dark:text-purple-400">"{debouncedSearchQuery}"</span>
              {hasSearchResults && (
                <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                  {activeTab === 'favorites' 
                    ? `找到 ${filteredFavorites.length} 个收藏`
                    : `找到 ${filteredMovies.length + filteredTvShows.length + filteredVarietyShows.length} 个结果`
                  }
                </span>
              )}
            </p>
          </div>
        )}

        {/* 主内容区域 - 优化为完全居中布局 */}
        <div className='w-full max-w-none mx-auto'>
          {activeTab === 'favorites' ? (
            // 收藏夹视图
            <>
              <section className='mb-8'>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                    {debouncedSearchQuery ? '搜索结果' : '我的收藏'}
                  </h2>
                  {favoriteItems.length > 0 && !debouncedSearchQuery && (
                    <button
                      className='text-sm text-gray-500 hover:text-purple-700 dark:text-gray-400 dark:hover:text-purple-300 transition-colors'
                      onClick={async () => {
                        await clearAllFavorites();
                        setFavoriteItems([]);
                      }}
                    >
                      清空
                    </button>
                  )}
                </div>
                {/* 优化收藏夹网格布局，确保在新的居中布局下完美对齐 */}
                <div className='grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-6 lg:gap-x-8 justify-items-center'>
                  {filteredFavorites.map((item) => (
                    <div
                      key={item.id + item.source}
                      className='w-full max-w-44'
                    >
                      <VideoCard
                        query={item.search_title}
                        {...item}
                        from='favorite'
                        type={item.episodes > 1 ? 'tv' : ''}
                      />
                    </div>
                  ))}
                  {filteredFavorites.length === 0 && (
                    <div className='col-span-full text-center text-gray-500 py-8 dark:text-gray-400'>
                      {debouncedSearchQuery ? '未找到匹配的收藏内容' : '暂无收藏内容'}
                    </div>
                  )}
                </div>
              </section>

              {/* 收藏夹页面底部 Logo */}
              {!debouncedSearchQuery && <BottomKatelyaLogo />}
            </>
          ) : (
            // 首页视图
            <>
              {/* 继续观看 */}
              {!debouncedSearchQuery && <ContinueWatching />}

              {/* 热门电影 */}
              {(filteredMovies.length > 0 || !debouncedSearchQuery) && (
                <section className='mb-8'>
                  <div className='mb-4 flex items-center justify-between'>
                    <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                      热门电影
                    </h2>
                    {!debouncedSearchQuery && (
                      <Link
                        href='/douban?type=movie'
                        className='flex items-center text-sm text-gray-500 hover:text-purple-700 dark:text-gray-400 dark:hover:text-purple-300 transition-colors'
                      >
                        查看更多
                        <ChevronRight className='w-4 h-4 ml-1' />
                      </Link>
                    )}
                  </div>
                  <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                    {loading
                      ? // 加载状态显示灰色占位数据 (显示10个，2行x5列)
                        Array.from({ length: 10 }).map((_, index) => (
                          <div
                            key={index}
                            className='w-full'
                          >
                            <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-purple-200 animate-pulse dark:bg-purple-800'>
                              <div className='absolute inset-0 bg-purple-300 dark:bg-purple-700'></div>
                            </div>
                            <div className='mt-2 h-4 bg-purple-200 rounded animate-pulse dark:bg-purple-800'></div>
                          </div>
                        ))
                      : // 显示真实数据，只显示前10个实现2行布局
                        filteredMovies.map((movie, index) => (
                          <div
                            key={index}
                            className='w-full'
                          >
                            <VideoCard
                              from='douban'
                              title={movie.title}
                              poster={movie.poster}
                              douban_id={movie.id}
                              rate={movie.rate}
                              year={movie.year}
                              type='movie'
                            />
                          </div>
                        ))}
                  </div>
                </section>
              )}

              {/* 热门剧集 */}
              {(filteredTvShows.length > 0 || !debouncedSearchQuery) && (
                <section className='mb-8'>
                  <div className='mb-4 flex items-center justify-between'>
                    <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                      热门剧集
                    </h2>
                    {!debouncedSearchQuery && (
                      <Link
                        href='/douban?type=tv'
                        className='flex items-center text-sm text-gray-500 hover:text-purple-700 dark:text-gray-400 dark:hover:text-purple-300 transition-colors'
                      >
                        查看更多
                        <ChevronRight className='w-4 h-4 ml-1' />
                      </Link>
                    )}
                  </div>
                  <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                    {loading
                      ? // 加载状态显示灰色占位数据 (显示10个，2行x5列)
                        Array.from({ length: 10 }).map((_, index) => (
                          <div
                            key={index}
                            className='w-full'
                          >
                            <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-purple-200 animate-pulse dark:bg-purple-800'>
                              <div className='absolute inset-0 bg-purple-300 dark:bg-purple-700'></div>
                            </div>
                            <div className='mt-2 h-4 bg-purple-200 rounded animate-pulse dark:bg-purple-800'></div>
                          </div>
                        ))
                      : // 显示真实数据，只显示前10个实现2行布局
                        filteredTvShows.map((show, index) => (
                          <div
                            key={index}
                            className='w-full'
                          >
                            <VideoCard
                              from='douban'
                              title={show.title}
                              poster={show.poster}
                              douban_id={show.id}
                              rate={show.rate}
                              year={show.year}
                            />
                          </div>
                        ))}
                  </div>
                </section>
              )}

              {/* 热门综艺 */}
              {(filteredVarietyShows.length > 0 || !debouncedSearchQuery) && (
                <section className='mb-8'>
                  <div className='mb-4 flex items-center justify-between'>
                    <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                      热门综艺
                    </h2>
                    {!debouncedSearchQuery && (
                      <Link
                        href='/douban?type=show'
                        className='flex items-center text-sm text-gray-500 hover:text-purple-700 dark:text-gray-400 dark:hover:text-purple-300 transition-colors'
                      >
                        查看更多
                        <ChevronRight className='w-4 h-4 ml-1' />
                      </Link>
                    )}
                  </div>
                  <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                    {loading
                      ? // 加载状态显示灰色占位数据 (显示10个，2行x5列)
                        Array.from({ length: 10 }).map((_, index) => (
                          <div
                            key={index}
                            className='w-full'
                          >
                            <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-purple-200 animate-pulse dark:bg-purple-800'>
                              <div className='absolute inset-0 bg-purple-300 dark:bg-purple-700'></div>
                            </div>
                            <div className='mt-2 h-4 bg-purple-200 rounded animate-pulse dark:bg-purple-800'></div>
                          </div>
                        ))
                      : // 显示真实数据，只显示前10个实现2行布局
                        filteredVarietyShows.map((show, index) => (
                          <div
                            key={index}
                            className='w-full'
                          >
                            <VideoCard
                              from='douban'
                              title={show.title}
                              poster={show.poster}
                              douban_id={show.id}
                              rate={show.rate}
                              year={show.year}
                            />
                          </div>
                        ))}
                  </div>
                </section>
              )}

              {/* 无搜索结果提示 */}
              {debouncedSearchQuery && !hasSearchResults && (
                <div className="text-center py-12">
                  <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🔍🔍</div>
                  <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                    未找到匹配的内容
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    尝试使用其他关键词搜索，或浏览全部内容
                  </p>
                </div>
              )}

              {/* 首页底部 Logo */}
              {!debouncedSearchQuery && <BottomKatelyaLogo />}
            </>
          )}
        </div>
      </div>
      {announcement && showAnnouncement && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70 p-4 transition-opacity duration-300 ${
            showAnnouncement ? '' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 transform transition-all duration-300 hover:shadow-2xl'>
            <div className='flex justify-between items-start mb-4'>
              <h3 className='text-2xl font-bold tracking-tight text-gray-800 dark:text-white border-b border-purple-500 pb-1'>
                提示
              </h3>
              <button
                onClick={() => handleCloseAnnouncement(announcement)}
                className='text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-white transition-colors'
                aria-label='关闭'
              ></button>
            </div>
            <div className='mb-6'>
              <div className='relative overflow-hidden rounded-lg mb-4 bg-purple-50 dark:bg-purple-900/20'>
                <div className='absolute inset-y-0 left-0 w-1.5 bg-purple-500 dark:bg-purple-400'></div>
                <p className='ml-4 text-gray-600 dark:text-gray-300 leading-relaxed'>
                  {announcement}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCloseAnnouncement(announcement)}
              className='w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-white font-medium shadow-md hover:shadow-lg hover:from-purple-700 hover:to-purple-800 dark:from-purple-600 dark:to-purple-700 dark:hover:from-purple-700 dark:hover:to-purple-800 transition-all duration-300 transform hover:-translate-y-0.5'
            >
              我知道了
            </button>
          </div>
        </div>
      )}
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
