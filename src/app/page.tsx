import React, { useState, useEffect, useMemo, useCallback } from 'react';

// 定义类型
interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'movie' | 'tv' | 'variety';
  year?: string;
  rating?: number;
}

interface SearchComponentProps {
  data: SearchResult[];
  onSearch?: (query: string, results: SearchResult[]) => void;
  placeholder?: string;
  debounceDelay?: number;
  autoFocus?: boolean;
}

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

// 高亮文本组件
const HighlightText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim()) return <span>{text}</span>;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 px-1 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

// 主搜索组件
const SearchComponent: React.FC<SearchComponentProps> = ({
  data,
  onSearch,
  placeholder = "搜索电影、剧集、综艺...",
  debounceDelay = 300,
  autoFocus = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debouncedSearchQuery = useDebounce(searchQuery, debounceDelay);

  // 模糊搜索函数
  const fuzzySearch = useCallback((items: SearchResult[], query: string): SearchResult[] => {
    if (!query.trim()) return items;

    const lowerQuery = query.toLowerCase();
    return items.filter(item => {
      const searchText = `${item.title} ${item.description || ''} ${item.type} ${item.year || ''}`.toLowerCase();
      return searchText.includes(lowerQuery);
    });
  }, []);

  // 搜索处理
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchQuery.trim()) {
        setSearchResults(data);
        setShowResults(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const results = fuzzySearch(data, debouncedSearchQuery);
      setSearchResults(results);
      setShowResults(true);
      setIsLoading(false);
      
      // 回调函数
      if (onSearch) {
        onSearch(debouncedSearchQuery, results);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, data, fuzzySearch, onSearch]);

  // 键盘导航处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleResultSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showResults, searchResults, selectedIndex]);

  const handleResultSelect = (result: SearchResult) => {
    console.log('选中结果:', result);
    setSearchQuery(result.title);
    setShowResults(false);
    setSelectedIndex(-1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
    setSelectedIndex(-1);
  };

  // 搜索结果统计
  const resultsCount = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return data.length;
    return searchResults.length;
  }, [searchResults.length, debouncedSearchQuery, data.length]);

  return (
    <div className="w-full max-w-2xl mx-auto relative">
      {/* 搜索框 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg bg-white/80 backdrop-blur-sm 
                   placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   dark:bg-gray-800/80 dark:border-gray-600 dark:text-white dark:placeholder-gray-400
                   transition-all duration-200 text-base"
        />
        
        {/* 清除按钮 */}
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-8 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* 加载指示器 */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* 搜索结果下拉框 */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-gray-800 
                     border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {/* 结果统计 */}
          <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-600">
            找到 {resultsCount} 个结果
            {debouncedSearchQuery && (
              <span> 关键词: <span className="font-semibold">"{debouncedSearchQuery}"</span></span>
            )}
          </div>
          
          {/* 结果列表 */}
          {searchResults.length > 0 ? (
            <div className="py-1">
              {searchResults.map((result, index) => (
                <div
                  key={result.id}
                  onClick={() => handleResultSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  } ${index > 0 ? 'border-t dark:border-gray-600' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      <HighlightText text={result.title} query={debouncedSearchQuery} />
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs 
                                   bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {result.type === 'movie' ? '电影' : 
                       result.type === 'tv' ? '剧集' : '综艺'}
                    </span>
                  </div>
                  
                  {result.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      <HighlightText text={result.description} query={debouncedSearchQuery} />
                    </p>
                  )}
                  
                  <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-500">
                    {result.year && <span>{result.year}年</span>}
                    {result.rating && (
                      <span className="ml-2 flex items-center">
                        <svg className="w-3 h-3 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {result.rating}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : debouncedSearchQuery ? (
            // 无结果状态
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>未找到匹配的内容</p>
              <p className="text-sm mt-1">尝试使用其他关键词搜索</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
