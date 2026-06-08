import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchParkListData, type TicketParkListData, type TicketParkListItem } from '@/pkg-ticket/services/park-list';
import './index.scss';

const DEFAULT_PARK_LIST_TITLE = '热玩项目';
const DEFAULT_PARK_SLOT_CODE = 'index_hot_project';

// 解码首页传入的资源位参数，异常编码直接按原值处理。
function decodeRouteParam(value?: string) {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// 读取热玩列表页路由参数，slotCode 决定本页真实接口数据来源。
function resolveParkListRouteParams() {
  const params = Taro.getCurrentInstance().router?.params || {};
  return {
    slotCode: decodeRouteParam(params.slotCode) || DEFAULT_PARK_SLOT_CODE,
    title: decodeRouteParam(params.title) || DEFAULT_PARK_LIST_TITLE,
  };
}

// 渲染热玩榜单列表页，列表项使用接口返回 id 跳转项目详情。
const ParkListPage = observer(function ParkListPage() {
  const [listData, setListData] = useState<TicketParkListData>();
  const [activeTabId, setActiveTabId] = useState('');
  const [pageTitle, setPageTitle] = useState(DEFAULT_PARK_LIST_TITLE);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const routeParams = resolveParkListRouteParams();
      setPageTitle(routeParams.title);
      const nextData = await fetchParkListData(routeParams.slotCode);
      setListData(nextData);
      setActiveTabId(nextData.tabs[0]?.id || '');
    },
  });

  const activeItems = useMemo(() => {
    const items = listData?.items ?? [];
    if (!activeTabId) return items;
    return items.filter((item) => item.tabId === activeTabId);
  }, [activeTabId, listData?.items]);

  function openProjectDetail(item: TicketParkListItem) {
    Taro.navigateTo({
      url: `${MINI_PACKAGE_ROUTES.ticketParkDetail}?id=${encodeURIComponent(item.id)}`,
    });
  }

  return pageRuntime.renderPage(() => {
    if (!listData) return null;

    return (
      <View className="_pg">
        <PageShell title={pageTitle} className="_pg-shell">
          <PageHeader>
            <View className="_pg-tabs">
              {listData.tabs.map((tab) => (
                <View
                  className={`_pg-tabs_item ${activeTabId === tab.id ? '_pg-tabs_item--active' : ''}`}
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  <Text>{tab.title}</Text>
                </View>
              ))}
            </View>
          </PageHeader>

          <View className="_pg-content">
            {activeItems.length > 0 ? activeItems.map((item) => (
              <View className="_pg-card" key={item.id} onClick={() => openProjectDetail(item)}>
                <AppImage className="_pg-card_image" src={item.imageSrc} mode="aspectFill" emptyState="error" />
                <View className="_pg-card_body">
                  <View className="_pg-card_header">
                    <Text className="_pg-card_title">{item.title}</Text>
                    <Text className="_pg-card_link">详情</Text>
                  </View>
                  <View className="_pg-card_meta">
                    <AppIcon name="location" className="_pg-card_meta-icon" size={14} color="#626a73" />
                    <Text>{item.locationText}</Text>
                  </View>
                  <View className="_pg-card_meta">
                    <AppIcon name="heart" className="_pg-card_meta-icon" size={14} color="#626a73" />
                    <Text>{item.likeCount}</Text>
                  </View>
                  <View className="_pg-card_meta">
                    <AppIcon name="ask" className="_pg-card_meta-icon" size={14} color="#626a73" />
                    <Text>{item.statusText}</Text>
                  </View>
                </View>
              </View>
            )) : (
              <BaseEmpty title={`暂无${pageTitle}`} description="更多精彩内容敬请期待" />
            )}
          </View>
        </PageShell>
      </View>
    );
  });
});

export default ParkListPage;
