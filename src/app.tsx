import { PropsWithChildren, useEffect } from 'react';
import { configure } from 'mobx';
import { GlobalLoading } from '@/core/components/GlobalLoading';
import { LoginPopup } from '@/core/components/LoginPopup';
import { silentLogin } from '@/core/services/auth';
import './app.scss';

configure({
  enforceActions: 'observed',
});

// 渲染小程序应用壳，保持主包启动逻辑极轻量。
function App({ children }: PropsWithChildren) {
  useEffect(() => {
    // 触发小程序静默登录，失败时保持游客态不打断使用。
    silentLogin();
  }, []);

  return (
    <>
      {children}
      <LoginPopup />
      <GlobalLoading />
    </>
  );
}

export default App;
