import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { SkuPopup } from '@/core/components/commerce';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_MAIN_ROUTES, MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import type { HkpSkuGroup } from '@/core/types/hkp';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import {
  callWechatPhone,
  previewWechatImages,
  showWechatConfirm,
  showWechatShareGuide,
  showWechatToast,
} from '@/core/utils/wechat-actions';
import { addMallCartItem } from '@/pkg-mall/services/cart';
import { fetchProductDetailData } from '@/pkg-mall/services/product-detail';
import type { MallProductDetailData } from '@/pkg-mall/services/mock-data';
import './index.scss';

type MallSkuAction = 'cart' | 'buy';

const MALL_SERVICE_PHONE = '4009778899';

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

  async function handleSkuSubmit() {
    if (!product) return;

    setSkuVisible(false);

    if (skuAction === 'buy') {
      navigateToMiniRoute(MINI_PACKAGE_ROUTES.orderCheckout);
      return;
    }

    await addMallCartItem(product, {
      quantity,
      skuText: selectedSkuText || product.subtitle || '默认规格',
    });
    await showWechatToast('已加入购物车', 'success');
  }

  async function handleCouponPress() {
    const couponText = coupons
      .map((coupon) => `${coupon.amountText}：${coupon.thresholdText}`)
      .join('\n');

    await showWechatConfirm({
      title: '商品优惠券',
      content: couponText || '当前暂无可领取优惠券',
      confirmText: '知道了',
      cancelText: '关闭',
    });
  }

  async function handleParamsPress() {
    await showWechatConfirm({
      title: '商品参数',
      content: `品牌：Hello Kitty Park\n规格：${selectedSkuText || '默认规格'}\n材质：亲肤毛绒面料`,
      confirmText: '知道了',
      cancelText: '关闭',
    });
  }

  function handlePreviewGallery(current?: string) {
    void previewWechatImages({
      urls: gallery,
      current,
      emptyText: '暂无商品大图',
    });
  }

  function handlePreviewReviewImages(imageSrcs: string[], current?: string) {
    void previewWechatImages({
      urls: imageSrcs,
      current,
      emptyText: '暂无评价图片',
    });
  }

  function handlePreviewDetailImages(current?: string) {
    void previewWechatImages({
      urls: detailImages,
      current,
      emptyText: '暂无详情图片',
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
                <AppIcon name="home" size={16} color="#6b7280" />
                <Text className="_pg-footer_action-text">首页</Text>
              </View>
              <View
                className="_pg-footer_action"
                onClick={() => {
                  void callWechatPhone(MALL_SERVICE_PHONE);
                }}
              >
                <AppIcon name="service" size={16} color="#6b7280" />
                <Text className="_pg-footer_action-text">客服</Text>
              </View>
              <View
                className="_pg-footer_action"
                onClick={() => {
                  navigateToMiniRoute(MINI_PACKAGE_ROUTES.mallCart);
                }}
              >
                <AppIcon name="cart" size={16} color="#6b7280" />
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
                  <View className="_pg-gallery_preview" onClick={() => handlePreviewGallery(imageSrc)}>
                    <AppImage className="_pg-gallery_image" src={imageSrc} mode="aspectFit" emptyState="error" />
                  </View>
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
                    void showWechatToast('已收藏', 'success');
                  }}
                >
                  <AppIcon name="heart" size={16} color="#a1a1aa" />
                </View>
                <View
                  className="_pg-info_icon"
                  onClick={() => {
                    void showWechatShareGuide();
                  }}
                >
                  <AppIcon name="share" size={16} color="#a1a1aa" />
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
            <View className="_pg-benefit_row" onClick={() => void handleCouponPress()}>
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
              <AppIcon name="arrowRight" className="_pg-cell_arrow" size={16} color="#a1a1aa" />
            </View>
            <View className="_pg-cell" onClick={() => void handleParamsPress()}>
              <Text className="_pg-cell_label">参数</Text>
              <Text className="_pg-cell_value">品牌、型号、材质...</Text>
              <AppIcon name="arrowRight" className="_pg-cell_arrow" size={16} color="#a1a1aa" />
            </View>
          </View>

          <View className="_pg-review">
            <View className="_pg-section_header">
              <Text className="_pg-section_title">评论（5236）</Text>
              <View className="_pg-section_more" onClick={() => Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.orderReviewList })}>
                <Text>查看更多</Text>
                <AppIcon name="arrowRight" className="_pg-section_more-icon" size={14} color="#a1a1aa" />
              </View>
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
                      onClick={() => handlePreviewReviewImages(review.imageSrcs, imageSrc)}
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
                    Taro.navigateTo({ url: `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${recommendProduct.id}` });
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
              <AppImage
                className="_pg-detail_image"
                src={detailImages[0]}
                mode="aspectFill"
                emptyState="error"
                onClick={() => handlePreviewDetailImages(detailImages[0])}
              />
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
                onClick={() => handlePreviewDetailImages(imageSrc)}
              />
            ))}
          </View>
        </View>

        <PageShare>
          {product ? (
            <SkuPopup
              visible={skuVisible}
              product={product}
              skuGroups={skuGroups}
              quantity={quantity}
              submitText={skuAction === 'buy' ? '立即购买' : '加入购物车'}
              onClose={() => setSkuVisible(false)}
              onSubmit={() => void handleSkuSubmit()}
              onSelectSku={handleSelectSku}
              onQuantityChange={setQuantity}
            />
          ) : null}
        </PageShare>
      </PageShell>
    </View>
  ));
});

export default ProductDetailPage;
