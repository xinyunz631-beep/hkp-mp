import { PropsWithChildren } from 'react';
import { configure } from 'mobx';
import './app.scss';

configure({
  enforceActions: 'observed',
});

// 渲染小程序应用壳，保持主包启动逻辑极轻量。
function App({ children }: PropsWithChildren) {
  return children;
}

export default App;
