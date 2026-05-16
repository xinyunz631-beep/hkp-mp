import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchParkDetailData, type TicketParkDetailData } from '@/pkg-ticket/services/park-detail';
import './index.scss';

interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
}

function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <View className="_pg-section">
      <Text className="_pg-section_title">{title}</Text>
      {children}
    </View>
  );
}

const ParkDetailPage = observer(function ParkDetailPage() {
  const [detailData, setDetailData] = useState<TicketParkDetailData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchParkDetailData();
      setDetailData(nextData);
    },
  });

  function handleBookingEntry() {
    Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.ticketBooking });
  }

  return pageRuntime.renderPage(() => {
    if (!detailData) return null;

    const { park } = detailData;

    return (
      <View className="_pg">
        <PageShell title={park.name} className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <DetailSection title="介绍">
              <Text className="_pg-intro">{park.intro}</Text>
            </DetailSection>

            <DetailSection title="开放时间">
              <View className="_pg-schedule">
                {park.schedules.map((schedule) => (
                  <View className="_pg-schedule_item" key={schedule.dateRange}>
                    <Text className="_pg-schedule_range">{schedule.dateRange}</Text>
                    <View className="_pg-schedule_meta">
                      <Text className="_pg-schedule_days">{schedule.daysLabel}</Text>
                      <Text className="_pg-schedule_hours">{schedule.openHours}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </DetailSection>

            <DetailSection title="优惠政策">
              <View className="_pg-policy">
                {park.policies.map((policy) => (
                  <View className="_pg-policy_row" key={policy.label}>
                    <Text className="_pg-policy_label">{policy.label}</Text>
                    <Text className="_pg-policy_value">{policy.value}</Text>
                  </View>
                ))}
              </View>
            </DetailSection>

            <DetailSection title="其他信息">
              <View className="_pg-info">
                {park.otherInfo.map((item) => (
                  <View className="_pg-info_row" key={item.label}>
                    <Text className="_pg-info_label">{item.label}</Text>
                    <Text className="_pg-info_value">{item.value}</Text>
                  </View>
                ))}
                <View className="_pg-info_row _pg-info_row--link" onClick={handleBookingEntry}>
                  <Text className="_pg-info_label">在线购票</Text>
                  <Text className="_pg-info_action">前往预定 ›</Text>
                </View>
              </View>
            </DetailSection>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default ParkDetailPage;
