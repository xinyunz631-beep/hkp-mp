import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES, type MiniPackageRoute } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import './index.scss';

const ticketActions: Array<{
  title: string;
  desc: string;
  tag: string;
  route: MiniPackageRoute;
}> = [
  {
    title: '乐园详情',
    desc: '查看开放时间、优惠政策和园区信息',
    tag: '出行前必看',
    route: MINI_PACKAGE_ROUTES.ticketParkDetail,
  },
  {
    title: '门票预定',
    desc: '选择游玩日期，预定门票和年卡',
    tag: '当前可订',
    route: MINI_PACKAGE_ROUTES.ticketBooking,
  },
  {
    title: '乐园导览',
    desc: '快速查看吃住行游购娱服务分区',
    tag: '园内导航',
    route: MINI_PACKAGE_ROUTES.ticketParkGuide,
  },
];

// 渲染票务独立分包首页，承接乐园详情、导览和门票预定入口。
const TicketIndexPage = observer(function TicketIndexPage() {
  const pageRuntime = usePageRuntime();

  function navigateTo(route: MiniPackageRoute) {
    Taro.navigateTo({ url: route });
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="票务" className="_pg-shell">
        <View className="_pg-content">
          <View className="_pg-hero">
            <Text className="_pg-hero_label">Hello Kitty Park Ticket</Text>
            <Text className="_pg-hero_title">票务服务</Text>
            <Text className="_pg-hero_desc">提前了解园区信息，选择合适日期后即可进入门票预定。</Text>
          </View>

          <View className="_pg-actions">
            {ticketActions.map((item) => (
              <View className="_pg-action" key={item.title} onClick={() => navigateTo(item.route)}>
                <View className="_pg-action_main">
                  <Text className="_pg-action_tag">{item.tag}</Text>
                  <Text className="_pg-action_title">{item.title}</Text>
                  <Text className="_pg-action_desc">{item.desc}</Text>
                </View>
                <View className="_pg-action_icon">
                  <AppIcon name="arrowRight" size={16} color="#db2777" />
                </View>
              </View>
            ))}
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default TicketIndexPage;
