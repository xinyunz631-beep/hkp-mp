import { useMemo, useState } from 'react';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchReviewListData, type OrderReviewListData } from '@/pkg-order/services/review-list';
import './index.scss';

const ReviewListPage = observer(function ReviewListPage() {
  const [pageData, setPageData] = useState<OrderReviewListData>();
  const [activeFilterKey, setActiveFilterKey] = useState('');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchReviewListData();
      setPageData(nextData);
      setActiveFilterKey(nextData.filters[0]?.key ?? '');
    },
  });

  const visibleReviews = useMemo(() => {
    if (!pageData) return [];
    if (activeFilterKey === pageData.filters[0]?.key) return pageData.reviews;
    return pageData.reviews.slice(0, 2);
  }, [activeFilterKey, pageData]);

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    return (
      <View className="_pg">
        <PageShell title="评价" className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <View className="_pg-filters">
              {pageData.filters.map((filter) => (
                <View
                  className={`_pg-filters_item ${filter.key === activeFilterKey ? '_pg-filters_item--active' : ''}`}
                  key={filter.key}
                  onClick={() => setActiveFilterKey(filter.key)}
                >
                  {filter.text}
                </View>
              ))}
            </View>

            <View className="_pg-list">
              {visibleReviews.map((review) => (
                <View className="_pg-review" key={review.id}>
                  <View className="_pg-review_header">
                    <AppImage
                      className="_pg-review_avatar"
                      src={review.avatarSrc}
                      mode="aspectFill"
                      emptyState="error"
                    />
                    <Text className="_pg-review_name">{review.userName}</Text>
                  </View>
                  <Text className="_pg-review_time">{review.timeText}</Text>
                  <Text className="_pg-review_content">{review.content}</Text>
                  {review.imageSrcs.length > 0 ? (
                    <View className="_pg-review_images">
                      {review.imageSrcs.map((imageSrc, index) => (
                        <AppImage
                          className="_pg-review_image"
                          key={`${review.id}-${index}`}
                          src={imageSrc}
                          mode="aspectFill"
                          emptyState="error"
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default ReviewListPage;
