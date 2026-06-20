import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, Textarea, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import {
  chooseWechatImages,
  previewWechatImages,
  showWechatConfirm,
  showWechatToast,
} from '@/core/utils/wechat-actions';
import {
  fetchReviewCreateData,
  submitReviewCreateData,
  type OrderReviewCreateData,
} from '@/pkg-order/services/review-create';
import './index.scss';

const ReviewCreatePage = observer(function ReviewCreatePage() {
  const [pageData, setPageData] = useState<OrderReviewCreateData>();
  const [rating, setRating] = useState<number>();
  const [activeTagKey, setActiveTagKey] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const orderId = Taro.getCurrentInstance().router?.params?.orderId;
      const itemId = Taro.getCurrentInstance().router?.params?.itemId;
      const nextData = await fetchReviewCreateData(orderId, itemId);
      setPageData(nextData);
      setRating(typeof nextData.rating === 'number' && nextData.rating > 0 ? nextData.rating : undefined);
      setActiveTagKey(nextData.defaultTagKey);
      setReviewImages(nextData.images.map((image) => image.src).filter(Boolean));
    },
    loginRequired: true,
    loginReason: '登录后可评价订单',
  });

  async function handleUploadImage() {
    const nextImages = await chooseWechatImages({ count: Math.max(1, 6 - reviewImages.length) });
    if (nextImages.length === 0) return;

    setReviewImages((current) => [...current, ...nextImages].slice(0, 6));
  }

  async function handleSubmit() {
    if (pageData?.unavailableReason) {
      await showWechatToast(pageData.unavailableReason);
      return;
    }

    if (!pageData) {
      await showWechatToast('评价数据加载中，请稍后再试');
      return;
    }

    if (pageData.tags.length > 0 && !activeTagKey) {
      await showWechatToast('请选择评价标签');
      return;
    }

    if (!reviewText.trim()) {
      await showWechatToast('请填写评价内容');
      return;
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      await showWechatToast('请选择评分');
      return;
    }

    const confirmed = await showWechatConfirm({
      title: '提交评价',
      content: `确认提交${anonymous ? '匿名' : ''}评价？`,
      confirmText: '提交',
      cancelText: '再改改',
    });

    if (!confirmed) return;

    try {
      const result = await pageRuntime.withLoading(() => submitReviewCreateData({
        orderId: pageData.orderId,
        itemId: pageData.itemId,
        rating,
        tagKey: activeTagKey,
        reviewText,
        reviewImages,
        anonymous,
      }));
      await showWechatToast(result.auditTip, 'success');
      Taro.navigateBack({ delta: 1 });
    } catch (error) {
      await showWechatToast(error instanceof Error ? error.message : '评价提交失败，请稍后再试');
    }
  }

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    return (
      <View className="_pg">
        <PageShell
          title="评价晒单"
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={pageData.unavailableReason ? undefined : (
            <View className="_pg-footer">
              <View
                className="_pg-footer_button"
                onClick={() => void handleSubmit()}
              >
                {pageData.submitButtonText}
              </View>
            </View>
          )}
        >
          <View className="_pg-content">
            {pageData.productTitle || pageData.productImageSrc ? (
              <View className="_pg-product">
                <AppImage
                  className="_pg-product_image"
                  src={pageData.productImageSrc}
                  mode="aspectFill"
                  emptyState="error"
                  onClick={() => previewWechatImages({ urls: [pageData.productImageSrc], emptyText: '暂无商品大图' })}
                />
                <View className="_pg-product_main">
                  <Text className="_pg-product_title">{pageData.productTitle}</Text>
                  <Text className="_pg-product_hint">{pageData.hintText || '提交后将进入审核，审核通过后展示在商品详情页'}</Text>
                </View>
              </View>
            ) : null}

            {pageData.unavailableReason ? (
              <BaseEmpty
                className="_pg-empty"
                title="当前无法评价"
                description={pageData.unavailableReason}
              />
            ) : (
              <>
                <View className="_pg-rating">
                  <Text className="_pg-rating_label">评分</Text>
                  <View className="_pg-rating_stars">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const score = index + 1;
                      const active = typeof rating === 'number' && score <= rating;
                      return (
                        <View
                          className={`_pg-rating_star ${active ? '_pg-rating_star--active' : ''}`}
                          key={score}
                          onClick={() => setRating(score)}
                        >
                          <AppIcon name={active ? 'starFill' : 'star'} size={22} color={active ? '#f7adbf' : '#d1d5db'} />
                        </View>
                      );
                    })}
                  </View>
                  <Text className="_pg-rating_text">{typeof rating === 'number' ? `${rating}分` : '请选择'}</Text>
                </View>

                {pageData.tags.length > 0 ? (
                  <View className="_pg-tags">
                    {pageData.tags.map((tag) => (
                      <View
                        className={`_pg-tags_item ${tag.key === activeTagKey ? '_pg-tags_item--active' : ''}`}
                        key={tag.key}
                        onClick={() => setActiveTagKey(tag.key)}
                      >
                        {tag.text}
                      </View>
                    ))}
                  </View>
                ) : null}

                <View className="_pg-editor">
                  <Textarea
                    className="_pg-editor_textarea"
                    value={reviewText}
                    placeholder={pageData.placeholderText}
                    maxlength={pageData.maxLength}
                    onInput={(event) => setReviewText((event.detail.value || '').slice(0, pageData.maxLength))}
                  />
                  <Text className="_pg-editor_count">
                    {reviewText.length}/{pageData.maxLength}
                  </Text>
                </View>

                <View className="_pg-images">
                  {reviewImages.map((imageSrc) => (
                    <View className="_pg-images_item" key={imageSrc}>
                      <AppImage
                        className="_pg-images_preview"
                        src={imageSrc}
                        mode="aspectFill"
                        emptyState="error"
                        onClick={() => previewWechatImages({ urls: reviewImages, current: imageSrc })}
                      />
                      <View
                        className="_pg-images_remove"
                        onClick={() => setReviewImages((current) => current.filter((item) => item !== imageSrc))}
                      >
                        <AppIcon name="close" size={12} color="#ffffff" />
                      </View>
                    </View>
                  ))}
                  {reviewImages.length < 6 ? (
                    <View className="_pg-images_add" onClick={() => void handleUploadImage()}>
                      <AppIcon name="photograph" size={16} color="#4b5563" />
                    </View>
                  ) : null}
                </View>

                <View className="_pg-anonymous" onClick={() => setAnonymous((current) => !current)}>
                  <View className={`_pg-anonymous_check ${anonymous ? '_pg-anonymous_check--active' : ''}`} />
                  <Text className="_pg-anonymous_text">{pageData.anonymousText}</Text>
                </View>
              </>
            )}
          </View>
        </PageShell>
      </View>
    );
  });
});

export default ReviewCreatePage;
