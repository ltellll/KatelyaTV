'use client';

import { ChevronLeft, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';

import { SearchResult } from '@/lib/types';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

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

const searchContent = async (query: string): Promise<SearchResult[]> => {
  if (!query.trim()) return [];
  
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
    if (!response.ok) throw new Error('搜索失败');
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('搜索API错误:', error);
    return [];
  }
};

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const results = await searchContent(query);
      setSearchResults(results);
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 初始搜索和防抖搜索
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      performSearch(debouncedSearchQuery);
      // 更新URL参数但不触发页面刷新
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('q', debouncedSearchQuery);
      window.history.replaceState({}, '', newUrl.toString());
    } else {
      setSearchResults([]);
      setIsSearching(false);
      // 清空搜索参数
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('q');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [debouncedSearchQuery, performSearch]);

  // 初始加载时执行搜索
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, []); // 只在组件挂载时执行

  return (
    <PageLayout>
      <div className="px-4 sm:px-8 lg:px-12 py-6">
        {/* 搜索头部 */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-purple-600 mb-4 transition-colors dark:text-gray-400 dark:hover:text-purple-400"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            返回
          </button>
          
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="搜索电影、剧集、综艺..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-12 py-4 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm 
                       placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       dark:bg-gray-800/80 dark:border-gray-600 dark:text-white dark:placeholder-gray-400
                       transition-all duration-200 text-lg"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-100 rounded-r-xl transition-colors dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* 搜索结果 */}
        <div className="max-w-7xl mx-auto">
          {searchQuery && (
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                搜索结果
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                关键词: <span className="font-semibold text-purple-600 dark:text-purple-400">"{searchQuery}"</span>
                {isSearching ? (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">搜索中...</span>
                ) : (
                  <span className="ml-2 text-green-600 dark:text-green-400">
                    {searchResults.length > 0 ? `找到 ${searchResults.length} 个结果` : '未找到相关结果'}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* 搜索结果网格 */}
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {searchResults.map((item, index) => (
                <div key={`${item.id}-${index}`} className="w-full">
                  <VideoCard
                    from="search"
                    id={item.id}
                    title={item.title}
                    poster={item.poster}
                    douban_id={item.douban_id}
                    rate={item.rate}
                    year={item.year}
                    type={item.type || 'movie'}
                  />
                </div>
              ))}
            </div>
          ) : searchQuery && !isSearching ? (
            <div className="text-center py-20">
              <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">
                未找到相关结果
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-6">
                尝试使用其他关键词搜索，或返回首页浏览推荐内容
              </p>
              <Link
                href="/"
                className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                返回首页
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </PageLayout>
  );
}
