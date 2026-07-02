import { registerCustomerServiceAdapter } from './customer-service';
import { createQiyuCustomerServiceAdapter } from './qiyu-customer-service-adapter';

// 应用启动时注册七鱼客服适配器，页面入口继续只调用通用客服 service。
export function registerQiyuCustomerServiceAdapter() {
  registerCustomerServiceAdapter(createQiyuCustomerServiceAdapter());
}
