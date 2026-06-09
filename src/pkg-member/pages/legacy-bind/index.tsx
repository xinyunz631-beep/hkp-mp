import { useState } from 'react';
import { Input, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateBackOrHome } from '@/core/utils/navigation';
import { showWechatToast } from '@/core/utils/wechat-actions';
import { bindLegacyMember } from '@/pkg-member/services/profile';
import './index.scss';

function normalizeMobile(value: string) {
  return value.trim().replace(/\D/g, '');
}

function validateMobile(value: string) {
  return /^1[3-9]\d{9}$/.test(value);
}

// 渲染老会员绑定页，提交后由会员资料接口结果回写全局会员信息。
const LegacyBindPage = observer(function LegacyBindPage() {
  const [mobile, setMobile] = useState('');
  const pageRuntime = usePageRuntime({
    loginRequired: true,
    loginReason: '登录后可绑定老会员权益',
  });

  async function handleSubmit() {
    const nextMobile = normalizeMobile(mobile);

    if (!validateMobile(nextMobile)) {
      await showWechatToast('请输入正确的手机号');
      return;
    }

    await pageRuntime.withLoading(() => bindLegacyMember({ mobile: nextMobile }));
    await showWechatToast('绑定成功', 'success');
    setTimeout(() => {
      Promise.resolve(navigateBackOrHome()).catch(() => undefined);
    }, 300);
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="老会员绑定" className="_pg-shell" reserveTabBarSpace={false}>
        <View className="_pg-content">
          <Text className="_pg-title">老会员绑定</Text>
          <View className="_pg-form">
            <Text className="_pg-label">手机号</Text>
            <Input
              className="_pg-input"
              value={mobile}
              maxlength={11}
              type="number"
              placeholder="请输入手机号"
              placeholderClass="_pg-input_placeholder"
              onInput={(event) => {
                setMobile(event.detail.value || '');
              }}
            />
          </View>
          <View
            className={`_pg-submit ${validateMobile(normalizeMobile(mobile)) ? '_pg-submit--active' : ''}`}
            onClick={() => handleSubmit().catch(() => undefined)}
          >
            <Text>绑定</Text>
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default LegacyBindPage;
