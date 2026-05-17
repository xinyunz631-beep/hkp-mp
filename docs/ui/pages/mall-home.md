# 商城首页页面设计说明

## 基本信息

- 页面：商城首页
- 路由：src/pkg-mall/pages/index
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：docs/ui/source/hkp-mini-page/mall-home.png
- 当前版本：v0.3-interaction-ready
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-mall/pages/index/index.tsx
  - src/pkg-mall/pages/index/index.scss
  - src/pkg-mall/pages/index/index.config.ts
  - src/pkg-mall/services/index.ts

## 设计意图

商城分包首页首版按截图完成搜索框、轮播 Banner、8 宫格分类、活动卡、推荐商品和底部商城导航。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：搜索栏、轮播 Banner、分类入口、活动卡、推荐商品双列卡片。
- 固定底部：商城内底部导航，串到购物车和订单中心。

## 动态与静态边界

- 页面图片：真实图片区域后续统一使用 `AppImage`。
- 接口数据：通过对应分包 service 获取，页面不直接写接口 mock。
- 本地配置：页面标题、导航策略、路由和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：后续优先使用 `BaseEmpty`。
- error：后续优先使用 `BaseException` 或 `StatusException`。
- 未登录：需要身份时使用 `usePageRuntime({ loginRequired: true })` 或 `AuthAction`。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 页面数据 | `fetchMallHomeData()` | service 内归一和兜底 | 否 |

## 交互与跳转

- 搜索框进入 `mall-search`。
- Banner、分类、活动卡串到商城列表、分类、购物车、赠品页等入口。
- 商品卡进入 `mall-product-detail`。
- 推荐商品加购写入本地购物车 service，并给出微信 toast 成功反馈。
- 底部导航支持到 `mall-cart` 和 `order-home`。

## 交互矩阵

| 元素 | 处理结果 |
|---|---|
| 搜索框 | 进入商品搜索页 |
| Banner / 分类 / 活动卡 | 进入对应商城、会员卡券或赠品页面 |
| 商品卡 | 进入商品详情 |
| 加购按钮 | 写入本地购物车并提示成功 |
| 底部购物车 / 我的订单 | 进入购物车或订单中心 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| loading | `usePageRuntime` 初始化商城首页数据 |
| 图片为空 | `AppImage` 展示失败态占位 |
| 加购成功 | 本地购物车可在购物车页读取 |

## 微信开发工具验收清单

- 点击搜索、Banner、分类、活动卡、商品卡和底部导航，均应有跳转结果。
- 点击商品加购，再进入购物车，应能看到本地加入的商品分组。

## 实现映射

- `src/pkg-mall/pages/index/index.tsx`：页面骨架相关文件。
- `src/pkg-mall/pages/index/index.scss`：页面骨架相关文件。
- `src/pkg-mall/pages/index/index.config.ts`：页面骨架相关文件。

## 变更记录

### v0.3-interaction-ready

- 推荐商品加购改为写入本地购物车 service，去掉直接 toast 假反馈。
- 商城首页功能 icon 尺寸统一收回到 16。

### v0.2

- 按商城首页截图补齐首版 UI、mock 数据和核心跳转。

### v0.1

- Phase 1 登记页面骨架。

## 验证记录

- `2026-05-16`：`yarn typecheck`
- `2026-05-16`：`yarn check:page-convention`
- `2026-05-16`：`yarn check:package-boundary`
- `2026-05-16`：`yarn check:ui-contract`
