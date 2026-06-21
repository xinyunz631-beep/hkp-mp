import {
  ContactCard,
  FulfillmentCard,
  ProductCard,
  SceneActionBar,
  SharedTail,
  StatusCard,
} from './order-detail-sections';
import type { OrderDetailSceneViewProps } from './order-detail-scene-types';
import './DefaultOrderDetailView.scss';

// 未识别订单类型的兜底视图，承接未来新增业态但不冒充已设计闭环。
export function DefaultOrderDetailView(props: OrderDetailSceneViewProps) {
  const { detailData, onCouponPress, onPrimaryAction, onSceneAction, onViewAftersale } = props;

  return (
    <>
      <StatusCard detailData={detailData} sceneVariant="default" />
      <ProductCard detailData={detailData} title="订单内容" />
      <FulfillmentCard detailData={detailData} title="履约信息" />
      <ContactCard detailData={detailData} title="联系信息" />
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
