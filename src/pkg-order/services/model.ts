export interface OrderHomeTabData {
  key: string;
  text: string;
}

export interface OrderHomeActionData {
  text: string;
  tone?: 'default' | 'primary' | 'danger';
}

export interface OrderHomeItemData {
  id: string;
  orderId?: string;
  title: string;
  subtitle?: string;
  extraText?: string;
  imageSrc: string;
  quantity: number;
  priceText: string;
  actionText: string;
  actions?: OrderHomeActionData[];
}

export interface OrderHomeSectionData {
  id: string;
  tabKey: string;
  dateText: string;
  statusText: string;
  totalText: string;
  items: OrderHomeItemData[];
}

export interface OrderHomeData {
  tabs: OrderHomeTabData[];
  sections: OrderHomeSectionData[];
}

export interface OrderDetailFieldData {
  label: string;
  value: string;
}

export interface OrderTicketInstanceData {
  ticketNo: string;
  qrCodePayload: string;
  qrImageSrc?: string;
  productName: string;
  skuName: string;
  statusText: string;
  visitDate: string;
  validTimeText: string;
  useTimesText: string;
}

export interface OrderDetailData {
  id: string;
  sceneType?: string;
  orderStatus?: string;
  statusText: string;
  paidAmountText: string;
  primaryActionType?: 'pay' | 'aftersale' | 'refund' | 'none';
  payExpireAt?: string;
  title: string;
  quantityText: string;
  productFields: OrderDetailFieldData[];
  ticketInstances: OrderTicketInstanceData[];
  ticketFields: OrderDetailFieldData[];
  contactFields: OrderDetailFieldData[];
  amountFields: OrderDetailFieldData[];
  orderFields: OrderDetailFieldData[];
  refundButtonText: string;
}
