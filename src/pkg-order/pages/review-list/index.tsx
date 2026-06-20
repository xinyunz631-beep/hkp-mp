import { useCallback, useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { previewWechatImages } from '@/core/utils/wechat-actions';
import { fetchReviewListData, type OrderReviewListData } from '@/pkg-order/services/review-list';
import './index.scss';

const ReviewListPage = observer(function ReviewListPage() {
  const productId = Taro.getCurrentInstance().router?.params?.productId;
  const [pageData, setPageData] = useState<OrderReviewListData>();
  const [activeFilterKey, setActiveFilterKey] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchReviewListData(productId);
      setPageData(nextData);
      setActiveFilterKey(nextData.filters[0]?.key ?? '');
    },
  });

  const visibleReviews = useMemo(() => {
    if (!pageData) return [];
    if (pageData.filters.length === 0) return pageData.reviews;
    if (activeFilterKey === pageData.filters[0]?.key) return pageData.reviews;
    return pageData.reviews.filter((review) => review.tags.includes(activeFilterKey));
  }, [activeFilterKey, pageData]);

  // 列表触底时继续按真实分页回读评价，不再把第一页结果误当成完整评价池。
  const handleLoadMore = useCallback(async () => {
    if (!pageData?.hasMore || loadingMore || !productId || pageData.unavailableReason) return;

    setLoadingMore(true);
    try {
      const nextData = await fetchReviewListData(productId, {
        page: pageData.page + 1,
        pageSize: pageData.pageSize,
        existingReviews: pageData.reviews,
      });
      setPageData(nextData);
      setActiveFilterKey((currentFilterKey) => (
        nextData.filters.some((filter) => filter.key === currentFilterKey)
          ? currentFilterKey
          : (nextData.filters[0]?.key ?? '')
      ));
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, pageData, productId]);

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    return (
      <View className="_pg">
        <PageShell
          title="评价"
          className="_pg-shell"
          reserveTabBarSpace={false}
          scrollViewProps={{
            lowerThreshold: 160,
            onScrollToLower: handleLoadMore,
          }}
        >
          <View className="_pg-content">
            {pageData.unavailableReason ? (
              <BaseEmpty
                className="_pg-empty"
                title="当前无法查看评价"
                description={pageData.unavailableReason}
              />
            ) : (
              <>
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
                  {visibleReviews.length > 0 ? visibleReviews.map((review) => (
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
                      <View className="_pg-review_meta">
                        {typeof review.rating === 'number' ? <Text className="_pg-review_rating">{`${review.rating}分`}</Text> : null}
                        {review.timeText ? <Text className="_pg-review_time">{review.timeText}</Text> : null}
                      </View>
                      {review.tags.length > 0 ? (
                        <View className="_pg-review_tags">
                          {review.tags.map((tag) => (
                            <View className="_pg-review_tag" key={`${review.id}-${tag}`}>
                              <Text>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
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
                              onClick={() => previewWechatImages({ urls: review.imageSrcs, current: imageSrc })}
                            />
                          ))}
                        </View>
                      ) : null}
                    </View>
                  )) : (
                    <BaseEmpty
                      className="_pg-empty"
                      title="暂无评价记录"
                      description="当前没有可展示的真实订单评价。"
                    />
                  )}
                  {pageData.reviews.length > 0 ? (
                    <View className="_pg-list_footer">
                      <Text className="_pg-list_footer-text">
                        {loadingMore
                          ? '正在加载更多评价...'
                          : pageData.hasMore
                            ? `继续上滑查看更多评价（已加载 ${pageData.reviews.length}${pageData.totalCount > 0 ? ` / ${pageData.totalCount}` : ''}）`
                            : `评价已全部加载${pageData.totalCount > 0 ? `（共 ${pageData.totalCount} 条）` : ''}`}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </>
            )}
          </View>
        </PageShell>
      </View>
    );
  });
});

export default ReviewListPage;
