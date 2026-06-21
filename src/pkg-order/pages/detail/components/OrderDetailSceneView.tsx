import { View } from '@tarojs/components';
import { DefaultOrderDetailView } from './DefaultOrderDetailView';
import { HotelOrderDetailView } from './HotelOrderDetailView';
import { MallOrderDetailView } from './MallOrderDetailView';
import { TicketOrderDetailView } from './TicketOrderDetailView';
import {
  resolveSceneVariant,
  type OrderDetailSceneViewProps,
} from './order-detail-scene-types';

// 根据订单类型分发到具体详情模板，页面层无需关心业务布局差异。
export function OrderDetailSceneView(props: OrderDetailSceneViewProps) {
  const sceneVariant = resolveSceneVariant(props.detailData.sceneType);
  let sceneContent;

  switch (sceneVariant) {
    case 'ticket':
      sceneContent = <TicketOrderDetailView {...props} />;
      break;
    case 'mall':
      sceneContent = <MallOrderDetailView {...props} />;
      break;
    case 'hotel':
      sceneContent = <HotelOrderDetailView {...props} />;
      break;
    default:
      sceneContent = <DefaultOrderDetailView {...props} />;
      break;
  }

  return (
    <View className={`_pg-scene _pg-scene--${sceneVariant}`}>
      {sceneContent}
    </View>
  );
}
