// 在父组件中的使用示例
import { useState } from 'react';
import SearchBar from '@/components/SearchBar';

function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const handleSearch = async (query: string) => {
    setIsSearchLoading(true);
    try {
      // 执行搜索逻辑
      console.log('搜索:', query);
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleDeleteHistory = (item: string) => {
    setSearchHistory(prev => prev.filter(history => history !== item));
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
  };

  return (
    <div>
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        isLoading={isSearchLoading}
        searchHistory={searchHistory}
        onDeleteHistory={handleDeleteHistory}
        onClearHistory={handleClearHistory}
        placeholder="搜索您想找的内容..."
      />
    </div>
  );
}
