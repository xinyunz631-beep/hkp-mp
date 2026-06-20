import { useEffect, useRef, useState, type ReactNode } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AppSearchBar } from '@/core/components/AppSearchBar';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateBackOrHome } from '@/core/utils/navigation';
import { showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import {
  clearMallSearchHistory,
  fetchMallSearchData,
  fetchMallSearchRelatedProducts,
  readMallSearchHistory,
  saveMallSearchKeyword,
  type MallSearchData,
  type MallSearchRelatedData,
} from '@/pkg-mall/services/search';
import './index.scss';

// 读取搜索页路由关键词，供列表页返回或外部入口预填时复用。
function resolveSearchRouteKeyword() {
  const keyword = Taro.getCurrentInstance().router?.params?.keyword || '';

  try {
    return decodeURIComponent(keyword);
  } catch {
    return keyword;
  }
}

// 将商品名中命中的关键词分段渲染，命中片段用页面样式标红。
function renderHighlightedName(text: string, keyword: string) {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) return text;

  const nodes: ReactNode[] = [];
  const lowerText = text.toLowerCase();
  const lowerKeyword = trimmedKeyword.toLowerCase();
  let cursor = 0;
  let matchIndex = lowerText.indexOf(lowerKeyword, cursor);

  while (matchIndex >= 0) {
    if (matchIndex > cursor) {
      nodes.push(text.slice(cursor, matchIndex));
    }

    const nextCursor = matchIndex + trimmedKeyword.length;
    nodes.push(
      <Text className="_pg-highlight" key={`${matchIndex}-${nextCursor}`}>
        {text.slice(matchIndex, nextCursor)}
      </Text>,
    );
    cursor = nextCursor;
    matchIndex = lowerText.indexOf(lowerKeyword, cursor);
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

// 商品搜索页承接首页搜索入口，完成相关商品展示、键盘搜索和商城商品列表结果页闭环。
const SearchPage = observer(function SearchPage() {
  const [query, setQuery] = useState(resolveSearchRouteKeyword);
  const [searchData, setSearchData] = useState<MallSearchData>({
    placeholder: '搜索商城商品',
    hotKeywords: [],
    products: [],
  });
  const [historyKeywords, setHistoryKeywords] = useState<string[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<MallSearchRelatedData['products']>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const relatedRequestIdRef = useRef(0);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      setHistoryKeywords(readMallSearchHistory());
      try {
        const nextSearchData = await fetchMallSearchData();
        setSearchData(nextSearchData);
      } catch {
        setSearchData({
          placeholder: '搜索商城商品',
          hotKeywords: [],
          products: [],
        });
      }
    },
  });
  const activeKeyword = query.trim();

  useEffect(() => {
    if (!activeKeyword) {
      relatedRequestIdRef.current += 1;
      setRelatedProducts([]);
      setRelatedLoading(false);
      return undefined;
    }

    const requestId = relatedRequestIdRef.current + 1;
    relatedRequestIdRef.current = requestId;
    setRelatedLoading(true);

    const timer = setTimeout(() => {
      void fetchMallSearchRelatedProducts(activeKeyword)
        .then((nextData) => {
          if (relatedRequestIdRef.current !== requestId) return;
          setRelatedProducts(nextData.products);
        })
        .finally(() => {
          if (relatedRequestIdRef.current !== requestId) return;
          setRelatedLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [activeKeyword]);

  async function handleSearch(keyword = query) {
    const nextKeyword = keyword.trim();

    if (!nextKeyword) {
      await showWechatToast('请输入搜索关键词');
      return;
    }

    setHistoryKeywords(saveMallSearchKeyword(nextKeyword));
    Taro.navigateTo({
      url: `${MINI_PACKAGE_ROUTES.mallProducts}?keyword=${encodeURIComponent(nextKeyword)}`,
    });
  }

  function handleRelatedProductPress(productId: string) {
    if (activeKeyword) {
      setHistoryKeywords(saveMallSearchKeyword(activeKeyword));
    }

    Taro.navigateTo({
      url: `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${productId}`,
    });
  }

  async function handleClearHistory() {
    const confirmed = await showWechatConfirm({
      title: '清空历史搜索',
      content: '清空后将无法恢复，确定清空历史搜索吗？',
      confirmText: '清空',
      cancelText: '取消',
    });

    if (!confirmed) return;

    setHistoryKeywords(clearMallSearchHistory());
    await showWechatToast('已清空历史搜索', 'success');
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="商品搜索"
        navbar={false}
        className="_pg-shell"
        reserveTabBarSpace={false}
        scrollViewProps={{ refresherEnabled: false }}
      >
        <PageHeader>
          <View className="_pg-search-row">
            <View className="_pg-back" onClick={navigateBackOrHome}>
              <AppIcon name="back" size={16} color="#111111" />
            </View>
            <AppSearchBar
              className="_pg-search"
              value={query}
              placeholder={searchData.placeholder}
              focus
              autoFocus
              onChange={setQuery}
              onSearch={(nextValue) => {
                void handleSearch(nextValue);
              }}
              onClear={() => setQuery('')}
            />
          </View>
        </PageHeader>

        <View className="_pg-page">
          {activeKeyword ? (
            <View className="_pg-section _pg-section--related">
              <View className="_pg-section_header">
                <Text className="_pg-section_title">相关商品</Text>
                {relatedProducts.length > 0 ? (
                  <Text className="_pg-section_hint" onClick={() => void handleSearch(activeKeyword)}>查看全部</Text>
                ) : null}
              </View>
              {relatedLoading ? (
                <View className="_pg-related-status">
                  <Text>正在搜索...</Text>
                </View>
              ) : relatedProducts.length > 0 ? (
                <View className="_pg-related-list">
                  {relatedProducts.map((product) => (
                    <View className="_pg-related" key={product.id} onClick={() => handleRelatedProductPress(product.id)}>
                      <AppImage className="_pg-related_image" src={product.image.src} mode="aspectFit" emptyState="error" />
                      <View className="_pg-related_body">
                        <Text className="_pg-related_title">{renderHighlightedName(product.title, activeKeyword)}</Text>
                        <Text className="_pg-related_meta">{product.subtitle || product.salesText}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <BaseEmpty
                  className="_pg-empty"
                  title={`没有找到“${activeKeyword}”`}
                  description="换个关键词试试"
                  size="small"
                />
              )}
            </View>
          ) : (
            <>
              <View className="_pg-section">
                <Text className="_pg-section_title">热门搜索</Text>
                <View className="_pg-tags">
                  {searchData.hotKeywords.map((keyword) => (
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
              {historyKeywords.length > 0 ? (
                <View className="_pg-section _pg-section--history">
                  <View className="_pg-section_header">
                    <Text className="_pg-section_title">历史搜索</Text>
                    <View className="_pg-history-clear" onClick={() => void handleClearHistory()}>
                      <AppIcon name="delete" size={14} color="#98a2b3" />
                      <Text>清空</Text>
                    </View>
                  </View>
                  <View className="_pg-history-list">
                    {historyKeywords.map((keyword) => (
                      <View
                        className="_pg-history-item"
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
              ) : null}
            </>
          )}
        </View>
      </PageShell>
    </View>
  ));
});

export default SearchPage;
