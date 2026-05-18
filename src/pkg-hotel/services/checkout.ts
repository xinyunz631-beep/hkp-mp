import { resolveMockData } from '@/core/services/mock';
import {
  createLocalOrderId,
  createLocalOrderTime,
  saveLocalOrder,
  type LocalOrderRecord,
} from '@/core/services/local-order';
import { hotelCheckoutBaseData, hotelHomeData, type HotelCheckoutData } from './mock-data';

export type { HotelCheckoutData } from './mock-data';

interface SubmitHotelCheckoutPayload {
  hotelName: string;
  roomTitle: string;
  roomTagsText: string;
  stayDateText: string;
  nightsText: string;
  roomCount: number;
  guestNames: string[];
  mobile: string;
  totalAmount: number;
  discountAmount: number;
  couponText: string;
}

// 获取酒店确认订单页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchCheckoutData(roomId?: string) {
  const activeHotel = hotelHomeData.hotels[0];
  const room = activeHotel.rooms.find((item) => item.id === roomId) ?? activeHotel.rooms[0];

  return resolveMockData<HotelCheckoutData>({
    ...hotelCheckoutBaseData,
    roomTitle: room.title,
    roomTagsText: room.tagsText.replace(/\s+/g, '｜'),
    totalAmount: room.price + 120,
  });
}

// 模拟酒店订单支付成功并写入本地订单中心，后续替换真实接口时保持页面调用不变。
export function submitHotelCheckoutOrder(payload: SubmitHotelCheckoutPayload) {
  const orderId = createLocalOrderId('HOTEL-');
  const now = createLocalOrderTime();
  const record: LocalOrderRecord = {
    id: orderId,
    source: 'hotel',
    tabKey: 'pendingReceive',
    dateText: payload.stayDateText,
    statusText: '待入住',
    paidAmountText: `¥${payload.totalAmount.toFixed(2)}`,
    title: payload.roomTitle,
    quantityText: `X${payload.roomCount}`,
    totalText: `共${payload.roomCount}间 合计:¥${payload.totalAmount.toFixed(2)}`,
    productFields: [
      { label: '酒店名称', value: payload.hotelName },
      { label: '房型', value: payload.roomTitle },
      { label: '房型信息', value: payload.roomTagsText },
      { label: '入住日期', value: `${payload.stayDateText} ${payload.nightsText}` },
    ],
    ticketFields: [
      { label: '酒店地址', value: '安吉县天使大道8号' },
      { label: '入住时间', value: '14:00 后入住，12:00 前退房' },
      { label: '取消规则', value: '入住日前一天 18:00 前可申请取消' },
    ],
    contactFields: [
      { label: '入住人', value: payload.guestNames.join('、') },
      { label: '手机号', value: payload.mobile },
    ],
    amountFields: [
      { label: '房费', value: `¥${(payload.totalAmount + payload.discountAmount).toFixed(2)}` },
      { label: '优惠券', value: payload.couponText },
      { label: '优惠金额', value: `- ¥${payload.discountAmount.toFixed(2)}` },
      { label: '实付款', value: `¥${payload.totalAmount.toFixed(2)}` },
    ],
    orderFields: [
      { label: '订单编号', value: orderId },
      { label: '下单时间', value: now },
      { label: '支付方式', value: '微信支付' },
      { label: '支付时间', value: now },
    ],
    refundButtonText: '申请退款',
    homeItems: [
      {
        id: orderId,
        title: payload.roomTitle,
        subtitle: `${payload.stayDateText} ${payload.nightsText}`,
        imageSrc: '',
        quantity: payload.roomCount,
        priceText: `¥ ${payload.totalAmount.toFixed(2)}`,
        actionText: '查看详情',
      },
    ],
    createdAt: now,
  };

  return saveLocalOrder(record);
}
