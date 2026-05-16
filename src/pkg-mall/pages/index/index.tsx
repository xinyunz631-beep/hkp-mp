import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES, type MiniPackageRoute } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchMallHomeData } from '@/pkg-mall/services';
import type { MallCategoryItem, MallHomeData, MallPromoCard } from '@/pkg-mall/services/mock-data';
import './index.scss';

interface MallFooterItem {
  key: string;
  title: string;
  icon: 'home' | 'cart' | 'order';
  path: MiniPackageRoute;
}

const mallFooterItems: MallFooterItem[] = [
  { key: 'home', title: '首页', icon: 'home', path: MINI_PACKAGE_ROUTES.mallHome },
  { key: 'cart', title: '购物车', icon: 'cart', path: MINI_PACKAGE_ROUTES.mallCart },
  { key: 'order', title: '我的订单', icon: 'order', path: MINI_PACKAGE_ROUTES.orderHome },
];

const promoAccentClassMap = {
  purple: '_pg-promo_card--purple',
  orange: '_pg-promo_card--orange',
  pink: '_pg-promo_card--pink',
} as const;

// 商城首页首版按截图还原搜索、轮播、分类、活动卡和推荐商品，并串起核心购买入口。
const MallIndexPage = observer(function MallIndexPage() {
  const [homeData, setHomeData] = useState<MallHomeData>();
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchMallHomeData();
      setHomeData(nextData);
    },
  });

  const banners = homeData?.banners ?? [];
  const categories = homeData?.categories ?? [];
  const promos = homeData?.promos ?? [];
  const products = homeData?.products ?? [];

  function openPackagePage(path: MiniPackageRoute) {
    if (path === MINI_PACKAGE_ROUTES.mallHome) return;
    Taro.navigateTo({ url: path });
  }

  function handleSearch() {
    Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.mallSearch });
  }

  function handleCategoryPress(item: MallCategoryItem) {
    openPackagePage(item.path as MiniPackageRoute);
  }

  function handlePromoPress(card: MallPromoCard) {
    openPackagePage(card.path as MiniPackageRoute);
  }

  function handleProductPress(productId: string) {
    Taro.navigateTo({
      url: `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${productId}`,
    });
  }

  function handleAddToCart() {
    Taro.showToast({
      title: `已加入购物车`,
      icon: 'none',
    });
  }

  function handleFooterPress(item: MallFooterItem) {
    openPackagePage(item.path);
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="购物"
        className="_pg-shell"
        reserveTabBarSpace={false}
        scrollViewProps={{}}
        footer={(
          <View className="_pg-footer">
            {mallFooterItems.map((item) => {
              const active = item.key === 'home';

              return (
                <View
                  className={`_pg-footer_item ${active ? '_pg-footer_item--active' : ''}`}
                  key={item.key}
                  onClick={() => handleFooterPress(item)}
                >
                  <AppIcon
                    name={item.icon}
                    className="_pg-footer_icon"
                    size={18}
                    color={active ? '#db2777' : '#222222'}
                  />
                  <Text className="_pg-footer_text">{item.title}</Text>
                </View>
              );
            })}
          </View>
        )}
      >
        <View className="_pg-page">
          <View className="_pg-search" onClick={handleSearch}>
            <AppIcon name="search" className="_pg-search_icon" size={24} color="#c0c4cc" />
            <Text className="_pg-search_placeholder">Hello Kitty公仔</Text>
          </View>

          <View className="_pg-hero">
            <Swiper
              className="_pg-hero_swiper"
              autoplay
              circular
              interval={4500}
              onChange={(event) => {
                setActiveBannerIndex(event.detail.current);
              }}
            >
              {banners.map((banner) => (
                <SwiperItem key={banner.id}>
                  <View className="_pg-hero_item" onClick={() => openPackagePage(banner.path as MiniPackageRoute)}>
                    <AppImage className="_pg-hero_image" src={banner.imageSrc} mode="aspectFill" emptyState="error" />
                    <View className="_pg-hero_mask" />
                    <View className="_pg-hero_copy">
                      <Text className="_pg-hero_title">{banner.title}</Text>
                      <Text className="_pg-hero_subtitle">{banner.subtitle}</Text>
                    </View>
                  </View>
                </SwiperItem>
              ))}
            </Swiper>
            <View className="_pg-hero_dots">
              {banners.map((banner, index) => (
                <View
                  className={`_pg-hero_dot ${index === activeBannerIndex ? '_pg-hero_dot--active' : ''}`}
                  key={banner.id}
                />
              ))}
            </View>
          </View>

          <View className="_pg-category">
            {categories.map((item) => (
              <View className="_pg-category_item" key={item.id} onClick={() => handleCategoryPress(item)}>
                <View className="_pg-category_icon">
                  <AppImage
                    className="_pg-category_icon-image"
                    src={item.iconSrc}
                    mode="aspectFit"
                    emptyState="error"
                  />
                </View>
                <Text className="_pg-category_text">{item.title}</Text>
              </View>
            ))}
          </View>

          <View className="_pg-promo">
            {promos.map((card, index) => (
              <View
                className={`_pg-promo_card ${promoAccentClassMap[card.accent]} ${index === 0 ? '_pg-promo_card--large' : '_pg-promo_card--small'}`}
                key={card.id}
                onClick={() => handlePromoPress(card)}
              >
                <View className="_pg-promo_content">
                  <Text className="_pg-promo_title">{card.title}</Text>
                  <Text className="_pg-promo_subtitle">{card.subtitle}</Text>
                  <View className="_pg-promo_arrow">›</View>
                </View>
                <AppImage className="_pg-promo_image" src={card.imageSrc} mode="aspectFit" emptyState="error" />
              </View>
            ))}
          </View>

          <View className="_pg-section">
            <View className="_pg-section_header">
              <View className="_pg-section_mark" />
              <Text className="_pg-section_title">好物推荐</Text>
            </View>
            <View className="_pg-product-grid">
              {products.map((product) => (
                <View className="_pg-product-card" key={product.id} onClick={() => handleProductPress(product.id)}>
                  <AppImage className="_pg-product-card_image" src={product.image.src} mode="aspectFit" emptyState="error" />
                  <View className="_pg-product-card_body">
                    <Text className="_pg-product-card_title">{product.title}</Text>
                    <View className="_pg-product-card_footer">
                      <Text className="_pg-product-card_price">¥{product.price}</Text>
                      <View
                        className="_pg-product-card_cart"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAddToCart();
                        }}
                      >
                        <AppIcon name="cartAdd" size={14} color="#ffffff" />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default MallIndexPage;
