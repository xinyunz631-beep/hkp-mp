import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateBackOrHome } from '@/core/utils/navigation';
import { fetchProductsData } from '@/pkg-mall/services/products';
import type { MallProductListData } from '@/pkg-mall/services/mock-data';
import './index.scss';

type MallProductsTabKey = 'comprehensive' | 'sales' | 'price' | 'filter';

// 商品列表首版按截图补齐搜索头、排序条、商品行和固定金额栏，并打通去购物车入口。
const ProductsPage = observer(function ProductsPage() {
  const [listData, setListData] = useState<MallProductListData>();
  const [activeTab, setActiveTab] = useState<MallProductsTabKey>('comprehensive');
  const [priceAscending, setPriceAscending] = useState(true);
  const [previewAmount, setPreviewAmount] = useState(0);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchProductsData();
      setListData(nextData);
      setPreviewAmount(nextData.previewAmount);
    },
  });

  const tabs = listData?.tabs ?? [];
  const products = listData?.products ?? [];

  const sortedProducts = useMemo(() => {
    const nextProducts = [...products];

    if (activeTab === 'sales') {
      return nextProducts.reverse();
    }

    if (activeTab === 'price') {
      return nextProducts.sort((prev, next) => (
        priceAscending ? prev.price - next.price : next.price - prev.price
      ));
    }

    return nextProducts;
  }, [activeTab, priceAscending, products]);

  function handleSearch() {
    Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.mallSearch });
  }

  function handleTabChange(nextKey: MallProductsTabKey) {
    if (nextKey === 'filter') {
      Taro.showToast({
        title: '筛选面板稍后补齐',
        icon: 'none',
      });
      return;
    }

    if (nextKey === 'price') {
      setPriceAscending((currentValue) => !currentValue);
    }

    setActiveTab(nextKey);
  }

  function handleOpenDetail(productId: string) {
    Taro.navigateTo({
      url: `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${productId}`,
    });
  }

  function handleAddToCart(price: number) {
    setPreviewAmount((currentValue) => Number((currentValue + price).toFixed(2)));
    Taro.showToast({
      title: '已加入购物车',
      icon: 'none',
    });
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="商品列表"
        navbar={false}
        className="_pg-shell"
        reserveTabBarSpace={false}
        scrollViewProps={{}}
        footer={(
          <View className="_pg-footer">
            <View className="_pg-footer_summary">
              <View className="_pg-footer_price">
                <Text className="_pg-footer_label">金额:</Text>
                <Text className="_pg-footer_amount">¥{previewAmount.toFixed(2)}</Text>
              </View>
              <Text className="_pg-footer_discount">已优惠: ¥{(listData?.discountAmount ?? 0).toFixed(2)}</Text>
            </View>
            <View
              className="_pg-footer_button"
              onClick={() => {
                Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.mallCart });
              }}
            >
              <Text>去购物车</Text>
            </View>
          </View>
        )}
      >
        <PageHeader>
          <View className="_pg-header">
            <View className="_pg-header_nav">
              <View className="_pg-header_back" onClick={navigateBackOrHome}>
                <AppIcon name="back" size={20} color="#111111" />
              </View>
              <View className="_pg-header_search" onClick={handleSearch}>
                <AppIcon name="search" className="_pg-header_search-icon" size={22} color="#c0c4cc" />
                <Text className="_pg-header_search-placeholder">搜索</Text>
              </View>
            </View>

            <View className="_pg-header_tabs">
              {tabs.map((tab) => {
                const tabKey = tab.key as MallProductsTabKey;
                const active = activeTab === tabKey;

                return (
                  <View
                    className={`_pg-header_tab ${active ? '_pg-header_tab--active' : ''}`}
                    key={tab.key}
                    onClick={() => handleTabChange(tabKey)}
                  >
                    <Text>{tab.text}</Text>
                    {tabKey === 'price' ? (
                      <Text className="_pg-header_tab-indicator">{priceAscending ? '↑' : '↓'}</Text>
                    ) : null}
                    {tabKey === 'filter' ? (
                      <AppIcon name="filter" className="_pg-header_tab-icon" size={18} color="#9ea4ad" />
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        </PageHeader>

        <View className="_pg-page">
          <View className="_pg-discount">
            <Text>{listData?.discountText}</Text>
          </View>

          <View className="_pg-list">
            {sortedProducts.map((product) => (
              <View className="_pg-product" key={product.id} onClick={() => handleOpenDetail(product.id)}>
                <AppImage className="_pg-product_image" src={product.image.src} mode="aspectFit" emptyState="error" />
                <View className="_pg-product_body">
                  <Text className="_pg-product_title">{product.title}</Text>
                  <Text className="_pg-product_size">{product.subtitle}</Text>
                  <Text className="_pg-product_price">¥ {product.price}</Text>
                </View>
                <View
                  className="_pg-product_cart"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleAddToCart(product.price);
                  }}
                >
                  <AppIcon name="cartAdd" size={24} color="#ffffff" />
                </View>
              </View>
            ))}
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default ProductsPage;
