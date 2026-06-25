import { useState } from 'react';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import {
  fetchMemberAnnualCards,
  type MemberAnnualCardItem,
  type MemberAnnualCardsData,
  type MemberAnnualCardStatus,
} from '@/pkg-member/services/annual-cards';
import './index.scss';

// 生成单张年卡详情页跳转地址。
function resolveCardDetailRoute(card: MemberAnnualCardItem) {
  return `${MINI_PACKAGE_ROUTES.memberCardDetail}?cardId=${encodeURIComponent(card.id)}`;
}

// 根据年卡状态生成卡片状态样式。
function resolveCardStatusClass(status: MemberAnnualCardStatus) {
  if (status === 'active') return '_pg-card-item--active';
  if (status === 'expired') return '_pg-card-item--expired';
  if (status === 'closed') return '_pg-card-item--closed';
  return '';
}

// 渲染我的卡包页面，展示后端返回的年卡资产状态。
function CardsPage() {
  const [pageData, setPageData] = useState<MemberAnnualCardsData>();
  const [activeStatus, setActiveStatus] = useState<MemberAnnualCardStatus>('all');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchMemberAnnualCards({ status: activeStatus });
      setPageData(nextData);
    },
    refreshOnShow: true,
    loginRequired: true,
    loginReason: '登录后可查看我的卡包',
  });

  // 切换状态标签后重新按后端筛选拉取列表。
  async function handleStatusChange(status: MemberAnnualCardStatus) {
    if (status === activeStatus) return;
    setActiveStatus(status);
    const nextData = await pageRuntime.withLoading(() => fetchMemberAnnualCards({ status }));
    setPageData(nextData);
  }

  // 渲染单张年卡资产卡片。
  function renderCard(card: MemberAnnualCardItem) {
    return (
      <View
        className={['_pg-card-item', resolveCardStatusClass(card.status)].filter(Boolean).join(' ')}
        key={card.id}
        onClick={() => navigateToMiniRoute(resolveCardDetailRoute(card))}
      >
        <View className="_pg-card-item_header">
          <View className="_pg-card-item_title-wrap">
            <AppIcon name="ticket" size={16} color="#db2777" />
            <Text className="_pg-card-item_title">{card.title}</Text>
          </View>
          <Text className="_pg-card-item_status">{card.statusText}</Text>
        </View>
        {card.skuName ? <Text className="_pg-card-item_subtitle">{card.skuName}</Text> : null}
        <View className="_pg-card-item_body">
          {card.holderName ? (
            <View className="_pg-card-item_field">
              <Text className="_pg-card-item_label">持卡人</Text>
              <Text className="_pg-card-item_value">{card.holderName}</Text>
            </View>
          ) : null}
          {card.holderMobileText ? (
            <View className="_pg-card-item_field">
              <Text className="_pg-card-item_label">手机号</Text>
              <Text className="_pg-card-item_value">{card.holderMobileText}</Text>
            </View>
          ) : null}
          {card.validityText ? (
            <View className="_pg-card-item_field">
              <Text className="_pg-card-item_label">有效期</Text>
              <Text className="_pg-card-item_value">{card.validityText}</Text>
            </View>
          ) : null}
        </View>
        <View className="_pg-card-item_footer">
          {card.orderNo ? <Text className="_pg-card-item_order">来源订单 {card.orderNo}</Text> : <Text />}
          <View className="_pg-card-item_action">
            <Text>查看</Text>
            <AppIcon name="arrowRight" size={14} color="#98a2b3" />
          </View>
        </View>
      </View>
    );
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="我的卡包" className="_pg-shell" reserveTabBarSpace={false} scrollViewProps={{}}>
        <PageHeader>
          <View className="_pg-tabs">
            {(pageData?.tabs || [
              { key: 'all' as const, text: '全部' },
              { key: 'pendingActivation' as const, text: '待激活' },
              { key: 'active' as const, text: '已激活' },
              { key: 'expired' as const, text: '已过期' },
            ]).map((tab) => (
              <View
                className={`_pg-tab ${tab.key === activeStatus ? '_pg-tab--active' : ''}`}
                key={tab.key}
                onClick={() => {
                  void handleStatusChange(tab.key);
                }}
              >
                <Text>{typeof tab.count === 'number' ? `${tab.text} ${tab.count}` : tab.text}</Text>
              </View>
            ))}
          </View>
        </PageHeader>
        <View className="_pg-content">
          {pageData?.list.length ? (
            <View className="_pg-list">{pageData.list.map(renderCard)}</View>
          ) : (
            <View className="_pg-empty">
              <BaseEmpty title="暂无年卡" description="购买年卡后，可在这里查看状态和有效期。" />
            </View>
          )}
        </View>
      </PageShell>
    </View>
  ));
}

export default observer(CardsPage);
