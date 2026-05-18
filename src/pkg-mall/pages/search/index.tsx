import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppSearchBar } from '@/core/components/AppSearchBar';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateBackOrHome } from '@/core/utils/navigation';
import { showWechatToast } from '@/core/utils/wechat-actions';
import { fetchSearchData } from '@/pkg-mall/services/search';
import './index.scss';

// 商品搜索页按截图保留轻量搜索头和热门搜索关键词，不模拟系统键盘本体。
const SearchPage = observer(function SearchPage() {
  const [searchData, setSearchData] = useState<Awaited<ReturnType<typeof fetchSearchData>>>();
  const [query, setQuery] = useState('');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchSearchData();
      setSearchData(nextData);
      setQuery(nextData.query);
    },
  });

  async function handleSearch(keyword = query) {
    const nextKeyword = keyword.trim() || searchData?.query || '';

    if (!nextKeyword) {
      await showWechatToast('请输入搜索关键词');
      return;
    }

    Taro.navigateTo({
      url: `${MINI_PACKAGE_ROUTES.mallProducts}?keyword=${encodeURIComponent(nextKeyword)}`,
    });
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="商品搜索" navbar={false} className="_pg-shell" reserveTabBarSpace={false}>
        <PageHeader>
          <View className="_pg-search-row">
            <View className="_pg-back" onClick={navigateBackOrHome}>
              <AppIcon name="back" size={16} color="#111111" />
            </View>
            <AppSearchBar
              className="_pg-search"
              value={query}
              placeholder={searchData?.query || '搜索商品'}
              onChange={setQuery}
              onSearch={(nextValue) => {
                void handleSearch(nextValue);
              }}
              onClear={() => setQuery('')}
            />
            <Text className="_pg-cancel" onClick={navigateBackOrHome}>取消</Text>
          </View>
        </PageHeader>

        <View className="_pg-page">
          <View className="_pg-section">
            <Text className="_pg-section_title">热门搜索</Text>
            <View className="_pg-tags">
              {searchData?.hotKeywords.map((keyword) => (
                <View
                  className="_pg-tag"
                  key={keyword}
                  onClick={() => {
                    void handleSearch(keyword);
                  }}
                >
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
