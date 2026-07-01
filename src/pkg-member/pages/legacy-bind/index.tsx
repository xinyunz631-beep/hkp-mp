import { useState } from 'react';
import { Button, Text, View, type BaseEventOrig, type ButtonProps } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { navigateBackOrHome } from '@/core/utils/navigation';
import { showWechatToast } from '@/core/utils/wechat-actions';
import { parseWechatPhoneCredential, resolveWechatPhoneCredentialMessage } from '@/core/wechat/auth';
import { bindLegacyMemberWithWechatPhone } from '@/pkg-member/services/profile';
import './index.scss';

// 渲染老会员绑定页，提交后由会员资料接口结果回写全局会员信息。
const LegacyBindPage = observer(function LegacyBindPage() {
  const [binding, setBinding] = useState(false);
  const pageRuntime = usePageRuntime({
    loginRequired: true,
    loginReason: '登录后可绑定老会员权益',
  });

  async function handleWechatPhoneBind(event: BaseEventOrig<ButtonProps.onGetPhoneNumberEventDetail>) {
    if (binding) return;

    const credential = parseWechatPhoneCredential(event.detail);
    if (!credential) {
      await showWechatToast(resolveWechatPhoneCredentialMessage(event.detail, '请授权微信手机号后绑定'));
      return;
    }

    setBinding(true);
    try {
      await pageRuntime.withLoading(() => bindLegacyMemberWithWechatPhone(credential));
      await showWechatToast('绑定成功', 'success');
      setTimeout(() => {
        Promise.resolve(navigateBackOrHome()).catch(() => undefined);
      }, 300);
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, '绑定失败，请稍后再试'));
    } finally {
      setBinding(false);
    }
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="老会员绑定" className="_pg-shell" reserveTabBarSpace={false}>
        <View className="_pg-content">
          <Text className="_pg-title">老会员绑定</Text>
          <View className="_pg-intro">
            <Text>授权后将按微信手机号匹配老会员权益。</Text>
          </View>
          <Button
            className={`_pg-submit ${binding ? '_pg-submit--loading' : ''}`}
            disabled={binding}
            openType="getPhoneNumber"
            onGetPhoneNumber={(event) => {
              handleWechatPhoneBind(event).catch(() => undefined);
            }}
          >
            <Text>{binding ? '授权绑定中...' : '授权微信手机号绑定'}</Text>
          </Button>
        </View>
      </PageShell>
    </View>
  ));
});

export default LegacyBindPage;
