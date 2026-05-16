import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, Textarea, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchReviewCreateData, type OrderReviewCreateData } from '@/pkg-order/services/review-create';
import './index.scss';

const ReviewCreatePage = observer(function ReviewCreatePage() {
  const [pageData, setPageData] = useState<OrderReviewCreateData>();
  const [activeTagKey, setActiveTagKey] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchReviewCreateData();
      setPageData(nextData);
      setActiveTagKey(nextData.defaultTagKey);
    },
  });

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
                onClick={() => Taro.showToast({ title: '评价提交即将开放', icon: 'none' })}
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
              {pageData.images.map((image) => (
                <View className="_pg-images_item" key={image.id}>
                  <AppImage
                    className="_pg-images_preview"
                    src={image.src}
                    mode="aspectFill"
                    emptyState="error"
                  />
                  <View
                    className="_pg-images_remove"
                    onClick={() => Taro.showToast({ title: '图片编辑即将开放', icon: 'none' })}
                  >
                    <AppIcon name="close" size={12} color="#ffffff" />
                  </View>
                </View>
              ))}
              <View
                className="_pg-images_add"
                onClick={() => Taro.showToast({ title: '图片上传即将开放', icon: 'none' })}
              >
                <AppIcon name="photograph" size={30} color="#4b5563" />
              </View>
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
