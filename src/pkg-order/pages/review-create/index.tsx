import { useState } from 'react';
import { Text, Textarea, View } from '@tarojs/components';
import { observer } from 'mobx-react';
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
import { fetchReviewCreateData, type OrderReviewCreateData } from '@/pkg-order/services/review-create';
import './index.scss';

const ReviewCreatePage = observer(function ReviewCreatePage() {
  const [pageData, setPageData] = useState<OrderReviewCreateData>();
  const [activeTagKey, setActiveTagKey] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchReviewCreateData();
      setPageData(nextData);
      setActiveTagKey(nextData.defaultTagKey);
      setReviewImages(nextData.images.map((image) => image.src).filter(Boolean));
    },
  });

  async function handleUploadImage() {
    const nextImages = await chooseWechatImages({ count: Math.max(1, 6 - reviewImages.length) });
    if (nextImages.length === 0) return;

    setReviewImages((current) => [...current, ...nextImages].slice(0, 6));
  }

  async function handleSubmit() {
    if (!activeTagKey) {
      await showWechatToast('请选择评价标签');
      return;
    }

    if (!reviewText.trim()) {
      await showWechatToast('请填写评价内容');
      return;
    }

    const confirmed = await showWechatConfirm({
      title: '提交评价',
      content: `确认提交${anonymous ? '匿名' : ''}评价？`,
      confirmText: '提交',
      cancelText: '再改改',
    });

    if (!confirmed) return;

    await showWechatToast('评价已提交', 'success');
  }

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    return (
      <View className="_pg">
        <PageShell
          title="评价晒单"
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={(
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
                <Text className="_pg-product_hint">{pageData.hintText}</Text>
              </View>
            </View>

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
          </View>
        </PageShell>
      </View>
    );
  });
});

export default ReviewCreatePage;
