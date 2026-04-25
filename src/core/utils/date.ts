import dayjs from 'dayjs';

// 格式化日期时间，统一小程序内展示口径。
export function formatDateTime(value: string | number | Date, format = 'YYYY-MM-DD HH:mm') {
  return dayjs(value).format(format);
}
