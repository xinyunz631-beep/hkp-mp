import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import type { LoginResult } from '@/core/types/auth';
import type { HomeSummary } from '@/core/types/home';
import { formatCurrency } from '@/core/utils/money';

type MockMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface MockRequestOptions<TData = unknown> {
  url: string;
  method: MockMethod;
  data?: TData;
}

const mockUser: LoginResult = {
  token: 'mock-mini-token-20260425',
  user: {
    id: 'u_10001',
    nickname: '乐园体验官',
    mobile: '13800000000',
    levelName: '金卡会员',
    points: 2860,
  },
};

const homeSummary: HomeSummary = {
  parkName: '星河乐园',
  businessDate: '2026-04-25',
  notice: '今日营业时间 09:30-21:30，夜场票 16:00 后可入园。',
  metrics: [
    { label: '今日客流', value: '12,680', unit: '人' },
    { label: '会员权益', value: formatCurrency(128) },
    { label: '排队项目', value: '18', unit: '项' },
  ],
  services: [
    { key: 'ticket', title: '门票预订', description: '日场、夜场、套票统一入口', path: MINI_PACKAGE_ROUTES.ticketHome },
    { key: 'hotel', title: '酒店度假', description: '乐园酒店、亲子房和套餐', path: MINI_PACKAGE_ROUTES.hotelHome },
    { key: 'mall', title: '乐园商城', description: '纪念品、雨具、亲子周边', path: MINI_PACKAGE_ROUTES.mallHome },
    { key: 'dining', title: '园内点餐', description: '餐厅排队、套餐和自提', path: MINI_PACKAGE_ROUTES.diningHome },
    { key: 'order', title: '我的订单', description: '票务、酒店、点餐订单', path: MINI_PACKAGE_ROUTES.orderHome, requireLogin: true },
    { key: 'member', title: '会员中心', description: '积分、等级、权益和卡券', path: MINI_PACKAGE_ROUTES.memberHome, requireLogin: true },
  ],
};

const handlers: Record<string, (options: MockRequestOptions) => unknown> = {
  // 模拟静默登录接口，供 App 启动阶段建立会话。
  'POST /auth/silent-login': () => mockUser,
  // 模拟微信手机号授权登录接口，供全局登录弹窗优先使用。
  'POST /auth/phone-login': () => mockUser,
  // 模拟主动授权登录接口，供全局登录弹窗使用。
  'POST /auth/profile-login': () => mockUser,
  // 模拟首页聚合接口，保持主包只消费轻量数据。
  'GET /home/summary': () => homeSummary,
  // 模拟当前园区接口，供请求头和页面展示使用。
  'GET /park/current': () => ({
    id: 'park_001',
    name: homeSummary.parkName,
    businessDate: homeSummary.businessDate,
  }),
};

// 判断当前请求是否存在本地 mock 处理器。
export function hasMockHandler(method: MockMethod, url: string) {
  return Boolean(handlers[`${method} ${url}`]);
}

// 执行本地 mock 请求，模拟后端统一响应结构。
export async function mockRequest<TResponse, TData = unknown>(
  options: MockRequestOptions<TData>,
): Promise<TResponse> {
  const key = `${options.method} ${options.url}`;
  const handler = handlers[key];

  if (!handler) {
    throw new Error(`缺少接口处理器：${key}`);
  }

  return handler(options) as TResponse;
}
