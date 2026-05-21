# 我的页面设计说明

## 基本信息

- 页面：我的
- 路由：src/pages/member
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：docs/ui/source/hkp-mini-page/tabbar-my-online.png
- 当前版本：v0.5-tabbar-my-online
- 页面状态：interaction-ready
- 更新时间：2026-05-20
- 实现文件：
  - src/pages/member/index.tsx
  - src/pages/member/index.scss
  - src/pages/member/index.config.ts

## 设计意图

按 `tabbar-my-online.png` 还原主包“我的”tab：顶部会员资料与会员等级、三项资产入口、订单快捷入口、服务工具列表，以及页面内底部 tabbar。页面本身不强制登录，具体受保护动作通过 `AuthAction` 和目标页 `loginRequired` 做双保险。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`，标题为 `Hello Kitty Park`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 会员背景区：头像、微信用户昵称、初级会员标签
  - 资产入口：商品收藏、优惠券、分销收益
  - 订单卡片：待支付、待收货、待评价、退换/售后、我的订单
  - 服务工具：会员权益、我的地址、老会员绑定、开发票、联系客服
  - 页面内 `AppTabBar`

## 动态与静态边界

- 头像：优先读取 `rootStore.member.profile.avatarUrl`，无头像时使用项目统一远程头像兜底。
- 会员资料：昵称与等级读取全局会员态，无登录资料时按设计稿展示“微信用户 / 初级会员”。
- 资产数字：当前按本地 mock 展示，后续接会员聚合接口后替换。
- 分销/提现：仍属于后置板块，本页只做入口反馈，不提前铺开完整收益链路。

## 状态要求

- loading：页面运行时统一承接。
- empty：本页为聚合入口，不展示整页空态；目标页面各自负责空态。
- error：本页无首屏接口阻断；微信动作失败由 `wechat-actions` 降级处理。
- 未登录：页面可浏览，受保护入口使用 `AuthAction` 拉起登录弹窗。
- 已登录：头像、昵称、等级优先展示会员资料。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 会员摘要 | `rootStore.member` | 无资料时展示截图兜底文案 | 否 |
| 订单入口 | `pkg-order` 本地 mock | 跳转订单中心并按 query 选中 tab | 否 |
| 微信动作 | `wechat-actions` | 拨号失败复制电话；modal 保持原页 | 否 |

## 交互与跳转

- 头像、昵称和等级：登录后进入会员中心。
- 资产入口：商品收藏、优惠券进入对应页面；分销收益只做业务反馈与客服兜底。
- 订单入口：待支付、待收货、待评价进入订单中心并携带 `tab` query；退换/售后进入售后列表；我的订单进入全部订单。
- 服务工具：会员权益、我的地址进入对应页面；老会员绑定、开发票先弹确认框；联系客服直接调用微信电话。
- 本页显式开启页面内 `AppTabBar`。

## 交互矩阵

| 元素 | 处理结果 |
|---|---|
| 头像 / 昵称 / 等级 | 登录后跳转会员中心 |
| 商品收藏 | 登录后跳转 `src/pkg-mall/pages/favorites` |
| 优惠券 | 登录后跳转 `src/pkg-member/pages/coupons` |
| 分销收益 | 登录后弹出业务说明，可继续联系客服，不跳后置收益空页 |
| 待支付 | 登录后跳转订单中心并选中 `pendingPay` |
| 待收货 | 登录后跳转订单中心并选中 `pendingReceive` |
| 待评价 | 登录后跳转订单中心并选中 `pendingReview` |
| 退换/售后 | 登录后跳转 `src/pkg-order/pages/aftersale-list` |
| 我的订单 | 登录后跳转 `src/pkg-order/pages/index` |
| 会员权益 | 登录后跳转 `src/pkg-member/pages/index` |
| 我的地址 | 登录后跳转 `src/pkg-order/pages/address` |
| 老会员绑定 | 登录后弹确认框，确认后拨打客服电话 |
| 开发票 | 登录后弹确认框，确认后跳订单中心查看可申请订单 |
| 联系客服 | 调用微信拨号，失败时复制电话 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| 未登录 | 仍展示截图结构；受保护入口统一拉起登录弹窗 |
| 已登录 | 使用真实昵称、头像和等级覆盖默认展示 |
| 分销暂未展开 | 点击收益入口展示可理解业务反馈，不出现开发态或“暂缓”文案 |
| 拨号失败 | 自动复制客服电话作为降级 |
| 订单状态入口 | 订单中心根据 `tab` query 默认选中对应状态 |

## 微信开发工具验收清单

- 进入“我的”tab：顶部标题、会员资料、资产数字、订单卡片、服务工具和底部 tabbar 应接近 `tabbar-my-online.png`。
- 未登录点击任一受保护入口：应先出现统一登录弹窗。
- 登录后点击待支付、待收货、待评价：应进入订单中心并选中对应 tab。
- 登录后点击商品收藏、优惠券、退换/售后、会员权益、我的地址：应进入对应页面。
- 点击分销收益：应展示业务说明弹窗，不进入粗糙空页。
- 点击老会员绑定、开发票、联系客服：应分别出现确认弹窗或调起微信电话能力。

## 实现映射

- `src/pages/member/index.tsx`：我的 tab UI、入口矩阵、登录守卫和微信反馈。
- `src/pages/member/index.scss`：按截图还原视觉结构和布局。
- `src/pkg-order/pages/index/index.tsx`：支持 `tab` query 选中订单状态。

## 变更记录

### v0.5-tabbar-my-online

- 按 `tabbar-my-online.png` 重做“我的”tab 页面视觉与入口布局。
- 补齐资产、订单、服务工具所有可见点击反馈。
- 订单中心支持从“我的”页携带 `tab` query 进入对应状态。

### v0.4-interaction-ready

- 常用游客从占位提示改为本地联系人说明，并可跳门票预定。
- 客服和退出登录改为微信 API 封装：拨号、确认弹窗和 toast 反馈。
- 快捷入口图标尺寸收回到 `AppIcon` 16，符合功能 icon 默认尺寸约束。

### v0.3

- Phase 7 修复“我的”tab 页面过空问题，补齐账户卡、快捷入口、常用服务和账户设置区，并补回页面样式导入。

### v0.2

- Phase 7 确认我的页聚合入口可用，并显式开启页面内 tabbar。

### v0.1

- Phase 1 登记页面骨架。

## 验证记录

- `2026-05-17`：已通过 `yarn typecheck`
- `2026-05-17`：已通过 `yarn check:page-convention`
