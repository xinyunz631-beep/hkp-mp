export interface TicketBookingParkInfo {
  openTime: string;
  hotline: string;
  notice: string;
  address: string;
  travelDate: string;
  imageCount: number;
}

export interface TicketProduct {
  id: string;
  category: 'ticket' | 'annualCard';
  title: string;
  description: string;
  priceLabel: string;
  price: number;
  noticeText: string;
}

export interface TicketBookingData {
  parkInfo: TicketBookingParkInfo;
  products: TicketProduct[];
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const ticketBookingData: TicketBookingData = {
  parkInfo: {
    openTime: '10:00~17:00',
    hotline: '4009778899',
    notice: '详细节目单，欢迎戳一戳～',
    address: '浙江安吉县昌硕街道天使大道1号',
    travelDate: formatDate(new Date()),
    imageCount: 1,
  },
  products: [
    {
      id: 'anniversary-single-card',
      category: 'annualCard',
      title: '十周年限定单人年卡',
      description: '限1名身高1.0米（含）以上的人员使用',
      priceLabel: '网购价',
      price: 999,
      noticeText: '预定须知',
    },
  ],
};

// 获取门票预定页面数据，接真实接口时保留这里做字段归一和失败兜底。
export function fetchTicketBookingData() {
  return new Promise<TicketBookingData>((resolve) => {
    setTimeout(() => {
      resolve({
        ...ticketBookingData,
        parkInfo: {
          ...ticketBookingData.parkInfo,
          travelDate: formatDate(new Date()),
        },
      });
    }, 120);
  });
}
