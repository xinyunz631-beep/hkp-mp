import {
  ContactCard,
  FulfillmentCard,
  ProductCard,
  SceneActionBar,
  SharedTail,
  StatusCard,
} from './order-detail-sections';
import type { OrderDetailSceneViewProps } from './order-detail-scene-types';
import './MallOrderDetailView.scss';

// 商城订单详情独立视图：商品、配送、物流和售后入口按商城链路组织。
export function MallOrderDetailView(props: OrderDetailSceneViewProps) {
  const { detailData, onCouponPress, onPrimaryAction, onSceneAction, onViewAftersale } = props;

  return (
    <>
      <StatusCard detailData={detailData} sceneVariant="mall" />
      <ProductCard detailData={detailData} title="商品信息" />
      <ContactCard detailData={detailData} title="配送信息" />
      <FulfillmentCard detailData={detailData} title="物流信息" />
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
