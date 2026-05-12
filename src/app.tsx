import { PropsWithChildren, useEffect } from 'react';
import { configure } from 'mobx';
import { silentLogin } from '@/core/services/auth';
import './app.scss';

configure({
  enforceActions: 'observed',
});

// 渲染小程序应用壳，保持主包启动逻辑极轻量。
function App({ children }: PropsWithChildren) {
  useEffect(() => {
    // 触发 V2 授权获取 CSESSION，失败时保持游客态不打断首屏渲染。
    silentLogin();
  }, []);

  return <>{children}</>;
}

export default App;
