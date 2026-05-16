const MEMBER_CODE_REFRESH_INTERVAL = 30000;

// 生成会员码接口返回值的 mock 结果，后续接真实接口时只替换这里。
function buildMemberCodeValue() {
  const refreshBucket = Math.floor(Date.now() / MEMBER_CODE_REFRESH_INTERVAL).toString(36).toUpperCase();
  return `HKP-MEMBER-${refreshBucket}`;
}

// 拉取会员码内容，当前先用 mock 值兜底，保证页面能直接完成渲染。
export function fetchMemberCode() {
  return new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve(buildMemberCodeValue());
    }, 120);
  });
}
