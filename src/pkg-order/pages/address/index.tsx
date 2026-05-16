import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchAddressData } from '@/pkg-order/services/address';
import './index.scss';

// 渲染地址管理页面，具体业务内容按页面需求继续扩展。
const AddressPage = observer(function AddressPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchAddressData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="地址管理" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default AddressPage;
