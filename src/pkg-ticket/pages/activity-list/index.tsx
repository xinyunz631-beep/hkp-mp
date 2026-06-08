import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppImage } from '@/core/components/AppImage';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchActivityListData, type TicketActivityListData, type TicketActivityListItem } from '@/pkg-ticket/services/activity';
import './index.scss';

const DEFAULT_ACTIVITY_LIST_TITLE = '精选活动';
const DEFAULT_ACTIVITY_SLOT_CODE = 'index_activity';

// 解码首页传入的资源位参数，异常编码直接按原值处理。
function decodeRouteParam(value?: string) {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// 读取列表页路由参数，slotCode 决定本页真实接口数据来源。
function resolveActivityListRouteParams() {
  const params = Taro.getCurrentInstance().router?.params || {};
  return {
    slotCode: decodeRouteParam(params.slotCode) || DEFAULT_ACTIVITY_SLOT_CODE,
    title: decodeRouteParam(params.title) || DEFAULT_ACTIVITY_LIST_TITLE,
  };
}

// 渲染精选活动列表页，列表项使用接口返回 id 跳转活动详情。
const ActivityListPage = observer(function ActivityListPage() {
  const [listData, setListData] = useState<TicketActivityListData>();
  const [pageTitle, setPageTitle] = useState(DEFAULT_ACTIVITY_LIST_TITLE);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const routeParams = resolveActivityListRouteParams();
      setPageTitle(routeParams.title);
      const nextData = await fetchActivityListData(routeParams.slotCode);
      setListData(nextData);
    },
  });

  const items = listData?.items ?? [];

  function openActivityDetail(item: TicketActivityListItem) {
    Taro.navigateTo({
      url: `${MINI_PACKAGE_ROUTES.ticketActivityDetail}?id=${encodeURIComponent(item.id)}`,
    });
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title={pageTitle} className="_pg-shell">
        <View className="_pg-content">
          {items.length > 0 ? items.map((item) => (
            <View className="_pg-card" key={item.id} onClick={() => openActivityDetail(item)}>
              <AppImage className="_pg-card_image" src={item.imageSrc} mode="aspectFill" emptyState="error" />
              <View className="_pg-card_body">
                <Text className="_pg-card_title">{item.title}</Text>
                <Text className="_pg-card_desc">{item.description}</Text>
                <Text className="_pg-card_date">{item.dateText}</Text>
              </View>
            </View>
          )) : (
            <BaseEmpty title={`暂无${pageTitle}`} description="更多精彩内容敬请期待" />
          )}
        </View>
      </PageShell>
    </View>
  ));
});

export default ActivityListPage;
