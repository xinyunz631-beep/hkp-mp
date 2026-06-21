import {
  ContactCard,
  FulfillmentCard,
  ProductCard,
  SceneActionBar,
  SharedTail,
  StatusCard,
} from './order-detail-sections';
import type { OrderDetailSceneViewProps } from './order-detail-scene-types';
import './HotelOrderDetailView.scss';

// 酒店订单详情独立视图：入住产品和入住安排前置展示。
export function HotelOrderDetailView(props: OrderDetailSceneViewProps) {
  const { detailData, onCouponPress, onPrimaryAction, onSceneAction, onViewAftersale } = props;

  return (
    <>
      <StatusCard detailData={detailData} sceneVariant="hotel" />
      <ProductCard detailData={detailData} title="入住产品" />
      <FulfillmentCard detailData={detailData} title="入住安排" />
      <ContactCard detailData={detailData} title="入住信息" />
      <SceneActionBar detailData={detailData} onSceneAction={onSceneAction} />
      <SharedTail
        detailData={detailData}
        onCouponPress={onCouponPress}
        onPrimaryAction={onPrimaryAction}
        onViewAftersale={onViewAftersale}
      />
    </>
  );
}
