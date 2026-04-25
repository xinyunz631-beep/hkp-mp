import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { PageShell } from '@/core/components/PageShell';

const parkEntries = [
  { title: '票务核验', desc: '查看门票、套餐和入园说明', path: '/pkg-ticket/pages/index/index' },
  { title: '酒店服务', desc: '乐园酒店、行李和入住服务', path: '/pkg-hotel/pages/index/index' },
  { title: '餐饮点单', desc: '园内餐厅、取餐和排队', path: '/pkg-dining/pages/index/index' },
];

// 渲染乐园入口页，承载轻量导航和园区基础信息。
function ParkPage() {
  // 跳转对应业务分包，主包仅持有路径。
  function navigateTo(path: string) {
    Taro.navigateTo({ url: path });
  }

  return (
    <PageShell title="乐园" description="园区服务、票务、酒店和餐饮入口。">
      <View className="page-shell__section">
        {parkEntries.map((item) => (
          <View className="park-entry" key={item.title} onClick={() => navigateTo(item.path)}>
            <Text className="park-entry__title">{item.title}</Text>
            <Text className="park-entry__desc">{item.desc}</Text>
          </View>
        ))}
      </View>
    </PageShell>
  );
}

export default ParkPage;
