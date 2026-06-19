import { useMemo, useState } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { AppImage } from '@/core/components/AppImage';
import { AppShareButton } from '@/core/components/AppShareButton';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { fetchFavoritesData, removeMallFavoriteItem } from '@/pkg-mall/services/favorites';
import './index.scss';

type FavoriteItem = Awaited<ReturnType<typeof fetchFavoritesData>>['items'][number];

// 我的收藏页按截图补齐筛选、编辑态遮罩和快捷操作。
const FavoritesPage = observer(function FavoritesPage() {
  const [favoritesData, setFavoritesData] = useState<Awaited<ReturnType<typeof fetchFavoritesData>>>();
  const [activeFilter, setActiveFilter] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchFavoritesData();
      setFavoritesData(nextData);
      setActiveFilter(nextData.activeFilter);
      setSelectedItemId(nextData.items[0]?.id || '');
    },
    loginRequired: true,
    loginReason: '登录后可查看收藏',
  });

  const filters = favoritesData?.filters ?? [];
  const items = favoritesData?.items ?? [];
  const totalCount = favoritesData?.totalCount;
  const selectedItem = items.find((item) => item.id === selectedItemId);

  const visibleItems = useMemo(() => {
    if (activeFilter === '仅看有货') {
      return items.filter((item) => !item.invalid);
    }

    return items;
  }, [activeFilter, items]);

  useShareAppMessage(() => ({
    title: selectedItem?.title || '我的收藏',
    path: selectedItem
      ? `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${encodeURIComponent(selectedItem.id)}`
      : MINI_PACKAGE_ROUTES.mallFavorites,
    imageUrl: selectedItem?.image.src || undefined,
  }));

  function handleCardPress(itemId: string) {
    if (editMode) {
      setSelectedItemId(itemId);
      return;
    }

    Taro.navigateTo({
      url: `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${itemId}`,
    });
  }

  async function handleEditAction(item: FavoriteItem, action: 'cart' | 'delete') {
    if (action === 'cart') {
      if (item.invalid) {
        await showWechatToast('该收藏已失效，暂不能选择规格');
        return;
      }

      Taro.navigateTo({
        url: `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${encodeURIComponent(item.id)}`,
      });
      return;
    }

    const confirmed = await showWechatConfirm({
      title: '删除收藏',
      content: `确定删除「${item.title}」吗？`,
      confirmText: '删除',
      cancelText: '取消',
    });
    if (!confirmed) return;

    await removeMallFavoriteItem(item.id);
    setFavoritesData((currentData) => {
      if (!currentData) return currentData;
      const nextItems = currentData.items.filter((currentItem) => currentItem.id !== item.id);
      setSelectedItemId(nextItems[0]?.id || '');
      return {
        ...currentData,
        items: nextItems,
        filters: nextItems.some((currentItem) => currentItem.invalid) ? ['全部', '仅看有货'] : [],
        totalCount: typeof currentData.totalCount === 'number'
          ? Math.max(0, currentData.totalCount - 1)
          : nextItems.length,
      };
    });
    await showWechatToast('已删除收藏', 'success');
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="我的收藏"
        className="_pg-shell"
        reserveTabBarSpace={false}
        scrollViewProps={{}}
        navbarRight={visibleItems.length > 0 ? (
          <Text className="_pg-navbar_action" onClick={() => setEditMode((currentValue) => !currentValue)}>
            {editMode ? '完成' : '编辑'}
          </Text>
        ) : undefined}
      >
        <View className="_pg-page">
          {filters.length > 0 ? (
            <View className="_pg-filter">
              {filters.map((filter) => (
                <View
                  className={`_pg-filter_item ${activeFilter === filter ? '_pg-filter_item--active' : ''}`}
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                >
                  <Text>{filter}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {visibleItems.length > 0 ? (
            <View className="_pg-list">
              {visibleItems.map((item) => {
                const selected = editMode && selectedItemId === item.id;

                return (
                  <View className="_pg-item" key={item.id} onClick={() => handleCardPress(item.id)}>
                    <AppImage className="_pg-item_image" src={item.image.src} mode="aspectFit" emptyState="error" />
                    <View className="_pg-item_body">
                      <Text className="_pg-item_title">{item.title}</Text>
                      {item.invalid ? (
                        <Text className="_pg-item_status">失效</Text>
                      ) : (
                        <Text className="_pg-item_price">¥ {item.price}</Text>
                      )}
                    </View>

                    {selected ? (
                      <View className="_pg-item_overlay">
                        <View className="_pg-item_actions">
                          <View
                            className="_pg-item_action"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleEditAction(item, 'cart');
                            }}
                          >
                            <Text>选规格</Text>
                          </View>
                          <AppShareButton
                            className="_pg-item_action _pg-item_action--button"
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            <Text>请分享</Text>
                          </AppShareButton>
                          <View
                            className="_pg-item_action"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleEditAction(item, 'delete');
                            }}
                          >
                            <Text>删除</Text>
                          </View>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <BaseEmpty
              className="_pg-empty"
              title="暂无收藏商品"
              description={typeof totalCount === 'number' && totalCount > 0
                ? '收藏商品已全部失效或移除，请返回商城挑选最新商品。'
                : '收藏的商品会展示在这里。'}
            />
          )}
        </View>
      </PageShell>
    </View>
  ));
});

export default FavoritesPage;
