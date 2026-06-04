import { useMemo, useState } from 'react';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { fetchMemberExchangeListData, type MemberExchangeListData, type MemberExchangeProduct } from '@/pkg-member/services/exchange';
import './index.scss';

type ExchangeSortMode = 'recommend' | 'kcoinAsc' | 'kcoinDesc';

function resolveSortedProducts(products: MemberExchangeProduct[], sortMode: ExchangeSortMode) {
  if (sortMode === 'kcoinAsc') {
    return [...products].sort((prev, next) => prev.kCoinPrice - next.kCoinPrice);
  }

  if (sortMode === 'kcoinDesc') {
    return [...products].sort((prev, next) => next.kCoinPrice - prev.kCoinPrice);
  }

  return products;
}

// 渲染会员兑换专区，商品列表使用接口返回 id 跳转兑换商品详情。
const MemberExchangePage = observer(function MemberExchangePage() {
  const [pageData, setPageData] = useState<MemberExchangeListData>();
  const [sortMode, setSortMode] = useState<ExchangeSortMode>('recommend');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchMemberExchangeListData();
      setPageData(nextData);
    },
    loginRequired: true,
    loginReason: '登录后可进入兑换专区',
  });

  const products = useMemo(
    () => resolveSortedProducts(pageData?.products ?? [], sortMode),
    [pageData?.products, sortMode],
  );

  function handleSortPress() {
    setSortMode((currentMode) => (currentMode === 'kcoinAsc' ? 'kcoinDesc' : 'kcoinAsc'));
  }

  function openProductDetail(product: MemberExchangeProduct) {
    navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.memberExchangeDetail}?id=${encodeURIComponent(product.id)}`);
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="兑换专区" className="_pg-shell">
        <PageHeader>
          <View className="_pg-filter">
            <View
              className={`_pg-filter_item ${sortMode === 'recommend' ? '_pg-filter_item--active' : ''}`}
              onClick={() => setSortMode('recommend')}
            >
              <Text>推荐</Text>
            </View>
            <View className="_pg-filter_divider" />
            <View
              className={`_pg-filter_item ${sortMode !== 'recommend' ? '_pg-filter_item--active' : ''}`}
              onClick={handleSortPress}
            >
              <Text>K币排序</Text>
              <View className="_pg-sort-icons">
                <AppIcon
                  name="arrowRight"
                  className={`_pg-sort-icons_arrow _pg-sort-icons_arrow--up ${sortMode === 'kcoinAsc' ? '_pg-sort-icons_arrow--active' : ''}`}
                  size={12}
                  color={sortMode === 'kcoinAsc' ? '#e96b9e' : '#a3a3a3'}
                />
                <AppIcon
                  name="arrowRight"
                  className={`_pg-sort-icons_arrow _pg-sort-icons_arrow--down ${sortMode === 'kcoinDesc' ? '_pg-sort-icons_arrow--active' : ''}`}
                  size={12}
                  color={sortMode === 'kcoinDesc' ? '#e96b9e' : '#a3a3a3'}
                />
              </View>
            </View>
          </View>
        </PageHeader>

        <View className="_pg-content">
          {products.length > 0 ? (
            <View className="_pg-grid">
              {products.map((product) => (
                <View className="_pg-card" key={product.id} onClick={() => openProductDetail(product)}>
                  <AppImage className="_pg-card_image" src={product.imageSrc} mode="aspectFill" emptyState="error" />
                  <View className="_pg-card_body">
                    <Text className="_pg-card_title">{product.title}</Text>
                    <View className="_pg-card_price-row">
                      <Text className="_pg-card_origin">{product.originalKCoinPrice}K币</Text>
                      <Text className="_pg-card_price">{product.kCoinPrice}K币</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <BaseEmpty title="暂无可兑换商品" description="更多会员好礼敬请期待" />
          )}
        </View>
      </PageShell>
    </View>
  ));
});

export default MemberExchangePage;
