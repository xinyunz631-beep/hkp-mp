import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { SkuPopup } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_MAIN_ROUTES, MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import type { HkpSkuGroup } from '@/core/types/hkp';
import { fetchProductDetailData } from '@/pkg-mall/services/product-detail';
import type { MallProductDetailData } from '@/pkg-mall/services/mock-data';
import './index.scss';

type MallSkuAction = 'cart' | 'buy';

// 商品详情首版按截图补齐图集、价格、优惠、评价、推荐和购买底栏，并复用 SKU 弹层闭环。
const ProductDetailPage = observer(function ProductDetailPage() {
  const [detailData, setDetailData] = useState<MallProductDetailData>();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [skuVisible, setSkuVisible] = useState(false);
  const [skuAction, setSkuAction] = useState<MallSkuAction>('cart');
  const [skuGroups, setSkuGroups] = useState<HkpSkuGroup[]>([]);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchProductDetailData();
      setDetailData(nextData);
      setSkuGroups(nextData.skuGroups);
    },
  });

  const product = detailData?.product;
  const coupons = detailData?.coupons ?? [];
  const reviews = detailData?.reviews ?? [];
  const recommendProducts = detailData?.recommendProducts ?? [];
  const detailImages = detailData?.detailImages ?? [];
  const gallery = detailData?.gallery ?? [];

  const selectedSkuText = useMemo(() => skuGroups
    .map((group) => group.options.find((option) => option.id === group.selectedId)?.label)
    .filter(Boolean)
    .join('、'), [skuGroups]);

  function openSkuPopup(nextAction: MallSkuAction) {
    setSkuAction(nextAction);
    setSkuVisible(true);
  }

  function handleSelectSku(groupId: string, optionId: string) {
    setSkuGroups((currentGroups) => currentGroups.map((group) => (
      group.id === groupId
        ? { ...group, selectedId: optionId }
        : group
    )));
  }

  function handleSkuSubmit() {
    setSkuVisible(false);

    if (skuAction === 'buy') {
      Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.orderCheckout });
      return;
    }

    Taro.showToast({
      title: '已加入购物车',
      icon: 'none',
    });
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="商品详情"
        className="_pg-shell"
        reserveTabBarSpace={false}
        scrollViewProps={{}}
        footer={(
          <View className="_pg-footer">
            <View className="_pg-footer_actions">
              <View
                className="_pg-footer_action"
                onClick={() => {
                  Taro.switchTab({ url: MINI_MAIN_ROUTES.home });
                }}
              >
                <AppIcon name="home" size={24} color="#6b7280" />
                <Text className="_pg-footer_action-text">首页</Text>
              </View>
              <View
                className="_pg-footer_action"
                onClick={() => {
                  Taro.showToast({ title: '客服即将接入', icon: 'none' });
                }}
              >
                <AppIcon name="service" size={24} color="#6b7280" />
                <Text className="_pg-footer_action-text">客服</Text>
              </View>
              <View
                className="_pg-footer_action"
                onClick={() => {
                  Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.mallCart });
                }}
              >
                <AppIcon name="cart" size={24} color="#6b7280" />
                <Text className="_pg-footer_action-text">购物车</Text>
              </View>
            </View>
            <View className="_pg-footer_buttons">
              <View className="_pg-footer_button _pg-footer_button--cart" onClick={() => openSkuPopup('cart')}>
                <Text>加入购物车</Text>
              </View>
              <View className="_pg-footer_button _pg-footer_button--buy" onClick={() => openSkuPopup('buy')}>
                <Text>立即购买</Text>
              </View>
            </View>
          </View>
        )}
      >
        <View className="_pg-page">
          <View className="_pg-gallery">
            <Swiper
              className="_pg-gallery_swiper"
              circular
              onChange={(event) => {
                setGalleryIndex(event.detail.current);
              }}
            >
              {gallery.map((imageSrc, index) => (
                <SwiperItem key={`${imageSrc}-${index}`}>
                  <AppImage className="_pg-gallery_image" src={imageSrc} mode="aspectFit" emptyState="error" />
                </SwiperItem>
              ))}
            </Swiper>
            <View className="_pg-gallery_dots">
              {gallery.map((imageSrc, index) => (
                <View
                  className={`_pg-gallery_dot ${index === galleryIndex ? '_pg-gallery_dot--active' : ''}`}
                  key={`${imageSrc}-${index}`}
                />
              ))}
            </View>
          </View>

          <View className="_pg-info">
            <View className="_pg-info_price-row">
              <View className="_pg-info_price">
                <Text className="_pg-info_price-current">¥{product?.price}</Text>
                <Text className="_pg-info_price-origin">¥{product?.marketPrice}</Text>
              </View>
              <View className="_pg-info_icons">
                <View
                  className="_pg-info_icon"
                  onClick={() => {
                    Taro.showToast({ title: '已收藏', icon: 'none' });
                  }}
                >
                  <AppIcon name="heart" size={26} color="#a1a1aa" />
                </View>
                <View
                  className="_pg-info_icon"
                  onClick={() => {
                    Taro.showToast({ title: '分享能力稍后接入', icon: 'none' });
                  }}
                >
                  <AppIcon name="share" size={24} color="#a1a1aa" />
                </View>
              </View>
            </View>
            <Text className="_pg-info_title">{product?.title}</Text>
          </View>

          <View className="_pg-benefit">
            <View className="_pg-benefit_row">
              <Text className="_pg-benefit_label">优惠</Text>
              <View className="_pg-benefit_tag">折扣</View>
              <Text className="_pg-benefit_text">{detailData?.promoText}</Text>
            </View>
            <View className="_pg-benefit_row">
              <Text className="_pg-benefit_label">领券</Text>
              <View className="_pg-benefit_coupon-list">
                {coupons.map((coupon) => (
                  <View className="_pg-benefit_coupon" key={coupon.id}>
                    <Text>{coupon.amountText}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View className="_pg-cells">
            <View className="_pg-cell" onClick={() => openSkuPopup('cart')}>
              <Text className="_pg-cell_label">选择</Text>
              <Text className="_pg-cell_value">{selectedSkuText || '颜色、尺码'}</Text>
              <Text className="_pg-cell_arrow">›</Text>
            </View>
            <View className="_pg-cell">
              <Text className="_pg-cell_label">参数</Text>
              <Text className="_pg-cell_value">品牌、型号、材质...</Text>
              <Text className="_pg-cell_arrow">›</Text>
            </View>
          </View>

          <View className="_pg-review">
            <View className="_pg-section_header">
              <Text className="_pg-section_title">评论（5236）</Text>
              <Text className="_pg-section_more">查看更多 ›</Text>
            </View>
            {reviews.map((review) => (
              <View className="_pg-review_card" key={review.id}>
                <View className="_pg-review_tags">
                  {review.tags.map((tag) => (
                    <View className="_pg-review_tag" key={tag}>
                      <Text>{tag}</Text>
                    </View>
                  ))}
                </View>
                <Text className="_pg-review_author">{review.author}</Text>
                <Text className="_pg-review_content">{review.content}</Text>
                <View className="_pg-review_images">
                  {review.imageSrcs.map((imageSrc, index) => (
                    <AppImage
                      className="_pg-review_image"
                      src={imageSrc}
                      mode="aspectFill"
                      emptyState="error"
                      key={`${review.id}-${index}`}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>

          <View className="_pg-recommend">
            <View className="_pg-section_header">
              <Text className="_pg-section_title">为你推荐</Text>
            </View>
            <View className="_pg-recommend_list">
              {recommendProducts.map((recommendProduct) => (
                <View
                  className="_pg-recommend_item"
                  key={recommendProduct.id}
                  onClick={() => {
                    Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.mallProducts });
                  }}
                >
                  <AppImage className="_pg-recommend_image" src={recommendProduct.image.src} mode="aspectFit" emptyState="error" />
                  <Text className="_pg-recommend_title">{recommendProduct.title}</Text>
                  <Text className="_pg-recommend_price">¥ {recommendProduct.price}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="_pg-detail">
            <View className="_pg-section_header">
              <Text className="_pg-section_title">商品详情</Text>
            </View>
            <View className="_pg-detail_card">
              <AppImage className="_pg-detail_image" src={detailImages[0]} mode="aspectFill" emptyState="error" />
              <Text className="_pg-detail_brand">创意品牌Hello Kitty</Text>
              <Text className="_pg-detail_summary">让您的小朋友尽情享受独自的快乐时光</Text>
              <Text className="_pg-detail_desc">产品采用柔软毛绒面料制作，亲肤棉柔手感顺滑，享您居家公仔不错的选择</Text>
            </View>
            {detailImages.slice(1).map((imageSrc, index) => (
              <AppImage
                className="_pg-detail_image _pg-detail_image--extra"
                src={imageSrc}
                mode="aspectFill"
                emptyState="error"
                key={`${imageSrc}-${index}`}
              />
            ))}
          </View>
        </View>

        {product ? (
          <SkuPopup
            visible={skuVisible}
            product={product}
            skuGroups={skuGroups}
            quantity={quantity}
            submitText={skuAction === 'buy' ? '立即购买' : '加入购物车'}
            onClose={() => setSkuVisible(false)}
            onSubmit={handleSkuSubmit}
            onSelectSku={handleSelectSku}
            onQuantityChange={setQuantity}
          />
        ) : null}
      </PageShell>
    </View>
  ));
});

export default ProductDetailPage;
