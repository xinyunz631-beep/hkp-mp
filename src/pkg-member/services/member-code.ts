import { fetchBffCrmMemberCode } from '@/core/services/bff-crm-api';

// 拉取真实会员码内容，后端不再暴露 memberNo，页面只使用 qrContent。
export async function fetchMemberCode() {
  const code = await fetchBffCrmMemberCode({
    cacheBuster: Date.now(),
  });
  if (!code.qrContent) throw new Error('会员码暂不可用');
  return code.qrContent;
}
