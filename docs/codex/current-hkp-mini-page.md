# HKP 小程序全页面工程恢复检查点

## 当前状态

- 更新时间：`2026-05-16`
- 当前阶段：`Phase 5 - 订单/售后闭环`
- 当前分支：`feature/hkp-mini-phase-5-order-aftersale`
- 基线提交：`36b7517 chore: 保存小程序当前开发基线`
- 最近阶段提交：`b4873aa feat: 回补票务预定交互并补齐 NutUI 组件清单`
- 总控 Skill：`/Users/kite/.codex/skills/hkp-mini-build/SKILL.md`
- 主执行 Skill：`$mpcode-page`

## 已完成

- 已提交 `mini-program` 当前开发基线。
- 已从基线创建 `feature/hkp-mini-phase-0-prd-assets` 分支。
- 已新增 `$hkp-mini-build` 总控恢复 skill。
- 已把 `/Users/kite/Desktop/hkp/mini-page` 的 70 张 750px PNG 复制到 `docs/ui/source/hkp-mini-page/`。
- 已按业务语义重命名 UI 图，并生成 `docs/ui/source/hkp-mini-page/manifest.json`。
- 已新增 `docs/ui/pages/hkp-mini-prd.md` 作为全页面工程 PRD。
- 已更新 `docs/ui/page-registry.yaml` 顶层 HKP 工程元信息。
- Phase 0 门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
- 已进入 `feature/hkp-mini-phase-1-routes-shells` 分支。
- 已补齐 HKP 全页面工程的主包入口、分包首页和业务子页面骨架。
- 已更新 `src/app.config.ts` 分包页面注册和 `src/core/constants/routes.ts` 路由常量。
- 已将早期主包入口和分包 `index` 占位页迁到 `PageShell`、`usePageRuntime`、`observer` 和 `_pg-*` 页面规范。
- 已登记页面说明文档和 `docs/ui/page-registry.yaml` 页面索引。
- Phase 1 轻量门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
- `yarn build:weapp` 已尝试执行，Taro 构建在本地长时间无新增输出并出现 `system-configuration` 运行时 panic 日志，已手动终止，后续需单独复验完整产物。
- 已进入 `feature/hkp-mini-phase-2-shared-components` 分支。
- 已新增 `src/core/types/hkp.ts` 作为商品、订单、优惠券、地址、SKU、日期等基础 DTO。
- 已新增 `src/core/services/mock.ts` 作为本地数据返回和失败兜底工具。
- 已新增 `src/core/components/commerce` 交易通用组件，包含商品卡、订单卡、优惠券卡、地址卡、固定提交栏、数量选择、筛选 Tab、SKU 弹层和日期选择。
- 已为商城、票务、酒店、餐饮、订单、会员分包补齐 `services/mock-data.ts` 和基础页面 service 返回值。
- Phase 2 门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
- 已进入 `feature/hkp-mini-phase-3-mall-flow` 分支。
- 已完成商城首页、商品列表、商品详情、购物车四个核心页面的首版 UI、mock 数据和跳转闭环。
- 已补齐商城首页 service、商城页面所需 NutUI 图标外层封装，并保持 `AppImage` 空地址失败态占位策略。
- 已完成商城搜索、分类、收藏、赠品、推荐等辅助页面首版，商城分包页面流已完整可串。
- Phase 3 当前轮轻量门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
- 已进入 `feature/hkp-mini-phase-4-booking-flows` 分支，开始推进票务与酒店闭环；餐饮继续保留基础框架。
- 已完成票务链路首版补齐：乐园详情、门票预定、门票确认订单已形成可跳转闭环。
- 已完成酒店链路首版补齐：酒店首页、房间详情、酒店确认订单已形成可跳转闭环。
- Phase 4 票务/酒店闭环已收口，餐饮继续只保留基础框架与 service/mock 入口。
- 已完成订单主链路首版补齐：订单首页、订单详情、确认订单地址态已形成可跳转闭环。
- 已完成地址管理、物流详情、创建评价、评价列表四个订单扩展页面首版，并已从订单首页串到查看物流和去评价。
- 已移除各分包 `independent: true` 配置，恢复 `app.scss` 全局样式对分包页面的继承。
- 已回补门票预定页的日期选择、门票分区和交易组件复用，并新增 NutUI 组件选型清单，后续页面默认先查项目封装与清单。

## 当前约束

- `pkg-dining` 餐饮板块当前只保留页面基础框架和 service/mock 入口，不进入 UI 实现。
- `pkg-member` 下分销链路 `share-rule/share/share-income/share-invite/withdraw/withdraw-records` 当前只保留基础框架，不进入 UI 实现。
- 只有用户明确点名后，才允许继续完善以上两个板块的 UI。
- 用户中途发来的问题、提醒、补充条件默认只更新约束，不中断当前主线阶段；只有明确说“停”或改主任务时才切线。

## 下一步

1. 继续完成售后链路：取消订单、售后申请、售后类型、售后列表、售后进度。
2. 订单主链路后续如需补状态切换、复制订单号、评价提交等细节，再按截图继续收紧。
3. 餐饮 `pkg-dining` 继续只保留基础框架和 service/mock 入口，不进入 UI 实现。
4. Phase 5 收口后进入会员基础页与优惠券；会员分销链路继续只保留基础框架。

## 恢复方式

换账号或新会话后直接说：

```text
[$hkp-mini-build] 继续
```

Codex 应读取本文件、`docs/ui/pages/hkp-mini-prd.md`、`docs/ui/page-registry.yaml`、路由配置和 Git 状态后继续。

## 阶段分支

- `feature/hkp-mini-phase-0-prd-assets`：PRD、截图资产、registry 元信息、checkpoint。
- `feature/hkp-mini-phase-1-routes-shells`：路由和页面骨架。
- `feature/hkp-mini-phase-2-shared-components`：通用组件和基础 mock service。
- `feature/hkp-mini-phase-3-mall-flow`：商城闭环。
- `feature/hkp-mini-phase-4-booking-flows`：票务、酒店闭环；餐饮保持骨架。
- `feature/hkp-mini-phase-5-order-aftersale`：订单、售后、地址、评价、物流。
- `feature/hkp-mini-phase-6-member-growth`：会员基础页与优惠券；分销链路保持骨架。
- `feature/hkp-mini-phase-7-polish-verify`：状态补齐和整体验收。
