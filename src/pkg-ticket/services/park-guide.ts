import { request } from '@/core/request';

const PARK_GUIDE_ROUTE = '/pkg-ticket/pages/park-guide/index';

export interface TicketParkGuideSection {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  targetType: string;
  targetValue: string;
  sortOrder: number;
}

export interface TicketParkGuideData {
  title: string;
  description: string;
  imageSrc: string;
  sections: TicketParkGuideSection[];
}

interface ParkGuideApiSection {
  id?: string;
  title?: string;
  description?: string;
  imageSrc?: string;
  targetType?: string;
  targetValue?: string;
  sortOrder?: number;
}

interface ParkGuideApiData {
  title?: string;
  description?: string;
  imageSrc?: string;
  sections?: ParkGuideApiSection[];
}

// 规整后端文本字段，避免页面渲染 undefined 或纯空白内容。
function normalizeText(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function isSelfParkGuideRoute(value?: string) {
  return normalizeText(value) === PARK_GUIDE_ROUTE;
}

function isPageMapSection(section: TicketParkGuideSection) {
  const targetType = section.targetType.toLowerCase();
  return targetType === 'miniprogramroute' && (!section.targetValue || isSelfParkGuideRoute(section.targetValue));
}

// 将导览分区转换为页面稳定消费结构，并按 sortOrder 兜底排序。
function normalizeParkGuideSections(sections?: ParkGuideApiSection[]) {
  return (sections || [])
    .filter((section) => Boolean(section))
    .map((section, index): TicketParkGuideSection => ({
      id: normalizeText(section.id) || `park-guide-section-${index}`,
      title: normalizeText(section.title) || '服务分区',
      description: normalizeText(section.description),
      imageSrc: normalizeText(section.imageSrc),
      targetType: normalizeText(section.targetType),
      targetValue: normalizeText(section.targetValue),
      sortOrder: typeof section.sortOrder === 'number' ? section.sortOrder : 999 + index,
    }))
    .filter((section) => !isPageMapSection(section))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

// 将 BFF 园区导览响应转换为当前页面模型，页面无数据时继续展示业务空态。
function normalizeParkGuideData(data?: ParkGuideApiData | null): TicketParkGuideData {
  const sections = normalizeParkGuideSections(data?.sections);
  return {
    title: normalizeText(data?.title) || '乐园导览',
    description: normalizeText(data?.description),
    imageSrc: normalizeText(data?.imageSrc) || sections.find((section) => section.imageSrc)?.imageSrc || '',
    sections,
  };
}

// 判断导览接口是否已经有可展示内容，空数据不当作异常处理。
export function hasParkGuideContent(data?: TicketParkGuideData) {
  return Boolean(data?.description || data?.imageSrc || data?.sections.length);
}

// 读取小程序园区导览公开接口；该接口不需要登录，不触发小程序授权。
export function fetchParkGuideData() {
  return request<ParkGuideApiData>({
    url: '/api/bff/content/mini-program/park-guide',
    method: 'GET',
    auth: 'none',
    showErrorToast: false,
  }).then(normalizeParkGuideData);
}
