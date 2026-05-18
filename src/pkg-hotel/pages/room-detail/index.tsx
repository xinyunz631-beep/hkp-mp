import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { previewWechatImages } from '@/core/utils/wechat-actions';
import { fetchRoomDetailData, type HotelRoomDetailData } from '@/pkg-hotel/services/room-detail';
import './index.scss';

const RoomDetailPage = observer(function RoomDetailPage() {
  const [roomDetailData, setRoomDetailData] = useState<HotelRoomDetailData>();
  const [currentRoomId, setCurrentRoomId] = useState('luxury-twin');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const roomId = Taro.getCurrentInstance().router?.params?.roomId || 'luxury-twin';
      const nextData = await fetchRoomDetailData(roomId);
      setCurrentRoomId(roomId);
      setRoomDetailData(nextData);
    },
  });

  return pageRuntime.renderPage(() => {
    if (!roomDetailData) return null;

    const roomImageSrc = roomDetailData.imageSrc;

    return (
      <View className="_pg">
        <PageShell
          title="房间详情"
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={(
            <View className="_pg-footer">
              <View
                className="_pg-footer_button"
                onClick={() => Taro.navigateTo({ url: `${MINI_PACKAGE_ROUTES.hotelCheckout}?roomId=${currentRoomId}` })}
              >
                <Text>立即预订</Text>
              </View>
            </View>
          )}
        >
          <View className="_pg-content">
            <AppImage
              className="_pg-image"
              src={roomImageSrc}
              mode="aspectFill"
              onClick={() => previewWechatImages({ urls: [roomImageSrc], emptyText: '暂无房型大图' })}
            />

            <View className="_pg-summary">
              <View className="_pg-summary_heading">
                <Text className="_pg-summary_title">{roomDetailData.title}</Text>
                <Text className="_pg-summary_tag">{roomDetailData.tagText}</Text>
              </View>
              <View className="_pg-summary_meta">
                {roomDetailData.summaryItems.map((item) => (
                  <Text className="_pg-summary_meta-item" key={item}>
                    {item}
                  </Text>
                ))}
              </View>
            </View>

            <View className="_pg-line-row">
              <Text className="_pg-line-row_label">床型</Text>
              <Text className="_pg-line-row_value">{roomDetailData.bedType}</Text>
            </View>

            <View className="_pg-details">
              <Text className="_pg-details_title">{roomDetailData.detailLabel}</Text>
              {roomDetailData.featureGroups.map((item) => (
                <View className="_pg-details_item" key={item.label}>
                  <Text className="_pg-details_label">{item.label}：</Text>
                  <Text className="_pg-details_value">{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default RoomDetailPage;
