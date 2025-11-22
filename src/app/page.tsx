// 在父组件中使用
import React, { useState } from 'react';
import SearchComponent from './SearchComponent';

// 示例数据
const sampleData = [
  {
    id: '1',
    title: '流浪地球',
    description: '科幻冒险电影',
    type: 'movie',
    year: '2023',
    rating: 8.5
  },
  {
    id: '2', 
    title: '漫长的季节',
    description: '悬疑剧情剧集',
    type: 'tv',
    year: '2023',
    rating: 9.0
  }
];

function App() {
  const [searchData, setSearchData] = useState(sampleData);

  const handleSearch = (query: string, results: any[]) => {
    console.log('搜索查询:', query);
    console.log('搜索结果:', results);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">影视搜索</h1>
      <SearchComponent
        data={searchData}
        onSearch={handleSearch}
        placeholder="搜索您想看的电影、剧集..."
        debounceDelay={300}
        autoFocus={true}
      />
    </div>
  );
}

export default App;
