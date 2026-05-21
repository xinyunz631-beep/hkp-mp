# 新增/编辑地址页面设计说明

## 基本信息

- 页面：新增/编辑地址
- 路由：src/pkg-order/pages/address-edit
- 当前设计工具（以 `page-registry.currentTool` 为准）：code
- 设计文件：-
- 设计节点：-
- 设计稿名称：电商地址新增/编辑页
- 当前版本：v0.1
- 页面状态：commercial-ready
- 更新时间：2026-05-20
- 实现文件：
  - src/pkg-order/pages/address-edit/index.tsx
  - src/pkg-order/pages/address-edit/index.scss
  - src/pkg-order/pages/address-edit/index.config.ts
  - src/pkg-order/services/address.ts

## 设计意图

地址新增/编辑页面向商城收货地址场景：联系人与手机号手填，所在位置通过微信 `chooseLocation` 选择小区、楼宇或定位点，门牌号由用户手动补充；保存后写入本地地址 service，订单结算页读取默认地址形成闭环。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 表单信息：收件人、手机号、所在位置、门牌号、地址标签、默认地址
- 固定底部：保存地址

## 动态与静态边界

- 接口图片：本页无真实图片区域。
- 图标资源：位置、箭头、勾选等功能图标统一使用 `AppIcon`。
- 接口文本/数据：地址读取、保存、上限和默认地址归一通过 `src/pkg-order/services/address.ts` 获取。
- 代码渲染：页面结构、状态、交互和基础样式。
- 本地配置：页面标题、导航策略、分包注册和微信位置隐私 API 声明。

## 状态要求

- loading：页面运行时统一承接。
- empty：编辑页找不到地址时进入新增态，不展示技术错误。
- error：优先使用 `BaseException` 或 `StatusException`。
- 未登录：使用 `usePageRuntime({ loginRequired: true })` 做目标页兜底。
- 降级态：微信选点取消时保留原表单，权限失败时提示用户允许位置权限。

## 交互矩阵

| 元素 | 行为 | 反馈 |
|---|---|---|
| 收件人 | 手动输入，最多 20 字 | 为空时保存提示 |
| 手机号 | 数字键盘输入，最多 11 位 | 非中国大陆手机号格式时保存提示 |
| 所在位置 | 调起微信 `chooseLocation` | 选择后回显位置名称和地址，未选择时仅 toast 提示 |
| 门牌号 | 手动输入，最多 60 字 | 为空时保存提示 |
| 地址标签 | 家/公司/学校/乐园附近单选，可取消 | 选中态高亮 |
| 设为默认地址 | 本地切换默认标记 | 保存后 service 保证最多一个默认地址 |
| 保存地址 | 校验后写入本地缓存 | 成功 toast 后返回上一页 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| loading | `usePageRuntime` 统一展示页面 loading |
| 未登录 | `usePageRuntime({ loginRequired: true })` 登录阻断态 |
| 新增 | 表单为空，保存前检查地址数量是否已达 10 |
| 编辑 | 按路由 `id` 回填已有地址 |
| 地址已满 | 新增保存前 toast 提示，service 抛出 `ADDRESS_LIMIT_EXCEEDED` 双保险 |
| 微信选点取消 | toast 提示未选择地址，保持原表单 |

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 地址读取 | `getOrderAddress()` / `listOrderAddresses()` | 找不到地址时进入新增态 | 否 |
| 地址保存 | `saveOrderAddress()` | service 限制最多 10 条并归一默认地址 | 是 |
| 微信选点 | `chooseWechatLocation()` | 用户取消后 toast 并保持原值 | 否 |

## 交互与跳转

- 从地址列表新增进入时不带 `id`，页面按新增态渲染。
- 从地址列表编辑进入时携带 `id`，页面按已有地址回填。
- 点击所在位置：调用 `chooseWechatLocation()`，选择成功后回显位置名称和地址。
- 点击保存地址：校验通过后写入本地缓存，并返回上一页。

## 实现映射

- `src/pkg-order/pages/address-edit/index.tsx`：页面主体。
- `src/pkg-order/pages/address-edit/index.scss`：页面样式。
- `src/pkg-order/pages/address-edit/index.config.ts`：页面配置。
- `src/pkg-order/services/address.ts`：地址读取、保存、最多 10 条和默认地址归一。
- `src/core/utils/wechat-actions.ts`：微信位置选择封装。
- `src/app.config.ts`：微信 `chooseLocation` 隐私 API 声明。

## 微信开发工具验收清单

- 从地址列表点击新增，应进入新增地址页，不展示最多 10 个规则提示板块。
- 点击所在位置应调起微信位置选择，选择后页面回显位置名称和地址。
- 不填姓名、手机号、门牌号保存，应有明确 toast 和行内提示；未选择所在位置保存，仅 toast 提示。
- 新增地址保存后应返回列表，列表数量加 1。
- 编辑已有地址保存后应返回列表，地址内容更新。
- 达到 10 个地址后不能继续新增。

## 变更记录

### v0.1

- 新增独立地址新增/编辑页。
- 接入微信 `chooseLocation`，门牌号保持手动填写。
- 接入本地地址 service、最多 10 条限制和默认地址归一。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
- `git diff --check`
