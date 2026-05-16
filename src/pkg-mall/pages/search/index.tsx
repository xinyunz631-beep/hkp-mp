import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateBackOrHome } from '@/core/utils/navigation';
import { fetchSearchData } from '@/pkg-mall/services/search';
import './index.scss';

// 商品搜索页按截图保留轻量搜索头和热门搜索关键词，不模拟系统键盘本体。
const SearchPage = observer(function SearchPage() {
  const [searchData, setSearchData] = useState<Awaited<ReturnType<typeof fetchSearchData>>>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchSearchData();
      setSearchData(nextData);
    },
  });

  function handleSearch(keyword: string) {
    Taro.navigateTo({
      url: `${MINI_PACKAGE_ROUTES.mallProducts}?keyword=${encodeURIComponent(keyword)}`,
    });
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="商品搜索" navbar={false} className="_pg-shell" reserveTabBarSpace={false}>
        <View className="_pg-page">
          <View className="_pg-search-row">
            <View className="_pg-search" onClick={() => handleSearch(searchData?.query || '')}>
              <AppIcon name="search" className="_pg-search_icon" size={24} color="#b9bec6" />
              <Text className="_pg-search_text">{searchData?.query}</Text>
              <View className="_pg-search_clear">
                <Text>×</Text>
              </View>
            </View>
            <Text className="_pg-cancel" onClick={navigateBackOrHome}>取消</Text>
          </View>

          <View className="_pg-section">
            <Text className="_pg-section_title">热门搜索</Text>
            <View className="_pg-tags">
              {searchData?.hotKeywords.map((keyword) => (
                <View className="_pg-tag" key={keyword} onClick={() => handleSearch(keyword)}>
                  <Text>{keyword}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default SearchPage;
