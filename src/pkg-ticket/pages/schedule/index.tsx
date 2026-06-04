import { useState } from 'react';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { TicketRichText } from '@/pkg-ticket/components/TicketRichText';
import { fetchScheduleData, type TicketScheduleData } from '@/pkg-ticket/services/schedule';
import './index.scss';

// 渲染节目单页面，上方展示当天日期标题，具体节目内容完全由服务端富文本控制。
const SchedulePage = observer(function SchedulePage() {
  const [scheduleData, setScheduleData] = useState<TicketScheduleData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextScheduleData = await fetchScheduleData();
      setScheduleData(nextScheduleData);
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="节目单" className="_pg-shell">
        <View className="_pg-content">
          <View className="_pg-head">
            <Text className="_pg-head_title">{scheduleData?.dateText}</Text>
          </View>

          {scheduleData?.richTextHtml ? (
            <View className="_pg-rich">
              <TicketRichText className="_pg-rich_text" nodes={scheduleData.richTextHtml} />
            </View>
          ) : null}
        </View>
      </PageShell>
    </View>
  ));
});

export default SchedulePage;
