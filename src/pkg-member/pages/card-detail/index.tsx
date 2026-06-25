import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { AppIcon } from '@/core/components/AppIcon';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { copyWechatText } from '@/core/utils/wechat-actions';
import { MemberRichText } from '@/pkg-member/components/MemberRichText';
import {
  fetchMemberAnnualCardDetail,
  type MemberAnnualCardItem,
} from '@/pkg-member/services/annual-cards';
import './index.scss';

// 生成来源订单详情页跳转地址。
function buildOrderDetailRoute(orderNo: string) {
  return `${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(orderNo)}`;
}

// 根据年卡状态生成详情头图状态样式。
function resolveHeroStatusClass(status: MemberAnnualCardItem['status']) {
  if (status === 'active') return '_pg-hero--active';
  if (status === 'expired') return '_pg-hero--expired';
  if (status === 'closed') return '_pg-hero--closed';
  return '';
}

// 渲染年卡详情字段行，复制行为只作用于后端返回的真实值。
function DetailRow({ label, value, copyable }: { label: string; value?: string; copyable?: boolean }) {
  if (!value) return null;

  return (
    <View className="_pg-row">
      <Text className="_pg-row_label">{label}</Text>
      <View
        className="_pg-row_value-wrap"
        onClick={copyable ? () => {
          void copyWechatText(value, '已复制');
        } : undefined}
      >
        <Text className="_pg-row_value">{value}</Text>
        {copyable ? <AppIcon name="copy" size={14} color="#98a2b3" /> : null}
      </View>
    </View>
  );
}

// 渲染年卡详情页面，用于查看激活状态、有效期和使用说明。
function CardDetailPage() {
  const [card, setCard] = useState<MemberAnnualCardItem>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const params = Taro.getCurrentInstance().router?.params || {};
      const cardId = String(params.cardId || params.cardNo || '');
      if (!cardId) throw new Error('缺少年卡编号');
      const nextCard = await fetchMemberAnnualCardDetail(cardId);
      setCard(nextCard);
    },
    refreshOnShow: true,
    loginRequired: true,
    loginReason: '登录后可查看年卡详情',
  });

  return pageRuntime.renderPage(() => {
    if (!card) return null;

    return (
      <View className="_pg">
        <PageShell title="年卡详情" className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <View className={['_pg-hero', resolveHeroStatusClass(card.status)].filter(Boolean).join(' ')}>
              <View className="_pg-hero_header">
                <Text className="_pg-hero_title">{card.title}</Text>
                <Text className="_pg-hero_status">{card.statusText}</Text>
              </View>
              {card.skuName ? <Text className="_pg-hero_subtitle">{card.skuName}</Text> : null}
              {card.validityText ? (
                <View className="_pg-hero_validity">
                  <Text className="_pg-hero_validity-label">有效期</Text>
                  <Text className="_pg-hero_validity-value">{card.validityText}</Text>
                </View>
              ) : null}
            </View>

            <View className="_pg-card">
              <Text className="_pg-section-title">持卡人信息</Text>
              <DetailRow label="姓名" value={card.holderName} />
              <DetailRow label="手机号" value={card.holderMobileText} />
              <DetailRow label="身份证" value={card.holderIdCardText} />
            </View>

            <View className="_pg-card">
              <Text className="_pg-section-title">年卡信息</Text>
              <DetailRow label="年卡号" value={card.cardNo} copyable />
              <DetailRow label="入园方式" value={card.entryMethodText} />
              <DetailRow label="激活时间" value={card.activatedAtText} />
              <DetailRow label="实体卡号" value={card.physicalCardNo} copyable />
              {card.orderNo ? (
                <View className="_pg-row _pg-row--link" onClick={() => navigateToMiniRoute(buildOrderDetailRoute(card.orderNo || ''))}>
                  <Text className="_pg-row_label">来源订单</Text>
                  <View className="_pg-row_value-wrap">
                    <Text className="_pg-row_value">{card.orderNo}</Text>
                    <AppIcon name="arrowRight" size={14} color="#98a2b3" />
                  </View>
                </View>
              ) : null}
              <DetailRow label="有效期" value={card.validityText} />
            </View>

            {card.usageInstructionHtml ? (
              <View className="_pg-card">
                <Text className="_pg-section-title">使用说明</Text>
                <MemberRichText className="_pg-rich" nodes={card.usageInstructionHtml} />
              </View>
            ) : null}
          </View>
        </PageShell>
      </View>
    );
  });
}

export default observer(CardDetailPage);
