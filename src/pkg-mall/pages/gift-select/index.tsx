import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchGiftSelectData } from '@/pkg-mall/services/gift-select';
import './index.scss';

// 赠品选择页按截图实现双列宫格和更换操作。
const GiftSelectPage = observer(function GiftSelectPage() {
  const [giftData, setGiftData] = useState<Awaited<ReturnType<typeof fetchGiftSelectData>>>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchGiftSelectData();
      setGiftData(nextData);
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="选择赠送" className="_pg-shell" reserveTabBarSpace={false} scrollViewProps={{}}>
        <View className="_pg-page">
          <View className="_pg-grid">
            {giftData?.gifts.map((gift) => (
              <View className="_pg-item" key={gift.id}>
                <AppImage className="_pg-item_image" src={gift.image.src} mode="aspectFit" emptyState="error" />
                <Text className="_pg-item_title">{gift.title}</Text>
                <View
                  className="_pg-item_button"
                  onClick={() => {
                    Taro.showToast({
                      title: '赠品已更换',
                      icon: 'none',
                    });
                  }}
                >
                  <Text>更换</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default GiftSelectPage;
