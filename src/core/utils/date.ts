import dayjs from 'dayjs';

// 格式化日期时间，统一小程序内展示口径。
export function formatDateTime(value: string | number | Date, format = 'YYYY-MM-DD HH:mm') {
  return dayjs(value).format(format);
}

// 格式化日期，适合营业日、订单日和预约日展示。
export function formatDate(value: string | number | Date, format = 'YYYY-MM-DD') {
  return dayjs(value).format(format);
}

// 格式化时间段，适合乐园营业时间和预约时间展示。
export function formatTimeRange(start: string | number | Date, end: string | number | Date) {
  return `${dayjs(start).format('HH:mm')}-${dayjs(end).format('HH:mm')}`;
}
