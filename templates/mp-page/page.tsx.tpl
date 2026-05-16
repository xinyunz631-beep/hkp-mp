import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
__SERVICE_IMPORT__import './index.scss';

// 渲染__PAGE_TITLE__页面，具体业务内容按页面需求继续扩展。
const __PAGE_COMPONENT_NAME__ = observer(function __PAGE_COMPONENT_NAME__() {
  const pageRuntime = usePageRuntime(__RUNTIME_OPTIONS__);

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="__PAGE_TITLE__"__PAGE_SHELL_PROPS__ className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default __PAGE_COMPONENT_NAME__;
