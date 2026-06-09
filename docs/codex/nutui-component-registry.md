# NutUI 组件选型清单

## 目标

本文件是 `$mpcode-page` 的 NutUI 事实源，避免每次页面开发都重新翻组件库。当前项目已安装：

- `@nutui/nutui-react-taro@2.7.14`
- `@nutui/icons-react-taro@1.0.5`

默认执行顺序：

1. 先查 `src/core/components/*`、当前分包组件和同类页面是否已有项目封装。
2. 项目内没有，再查本清单里推荐的 NutUI 组件。
3. 命中后先封装一层项目组件或分包组件，再给页面使用。
4. 项目封装和 NutUI 都不合适，才允许页面内最小手写。

## 当前项目已封装映射

这些能力已经有项目入口，页面不要再直接散用 NutUI：

- 图标：`AppIcon`
  - 当前基于 `@nutui/icons-react-taro`
  - 已封装：`back`、`arrowRight`、`search`、`share`、`heart`、`cart`、`cartAdd`、`service`、`list`、`order`、`filter`、`imageError` 等
- 图片：`AppImage`
  - 统一灰底、loading、失败态、淡入
- 通用弹层：`AppPopup`
  - 统一承接 `Popup` 类场景
- 页面导航：`PageNavbar`
  - 不直接使用 NutUI `NavBar`
- 页面底部导航：`AppTabBar`
  - 不直接使用 NutUI `Tabbar`
- 交易通用组件：`src/core/components/commerce`
  - `FixedSubmitBar`
  - `QuantityStepper`
  - `DateRangePanel`
  - `FilterTabs`
  - `StatusListTabs`
  - `ProductCard`
  - `OrderCard`
  - `CouponCard`
  - `AddressCard`
  - `SkuPopup`
  - `DateSelectionPopup`
  - `CouponSelectionPopup`

## 高优先级可选 NutUI 组件

这些是当前小程序页面开发最常见、最值得优先查的 NutUI 组件：

### 表单与输入

- `Input`
- `TextArea`
- `InputNumber`
- `Checkbox` / `CheckboxGroup`
- `Radio` / `RadioGroup`
- `Switch`
- `Form` / `FormItem`
- `Picker`
- `DatePicker`
- `Cascader`

### 日期与时间

- `Calendar`
- `CalendarCard`
- `TimeSelect`
- `TimeDetail`

### 列表与结构

- `Cell` / `CellGroup`
- `Tabs` / `TabPane`
- `Swiper` / `SwiperItem`
- `Collapse` / `CollapseItem`
- `Grid` / `GridItem`
- `Card`

### 反馈与状态

- `Loading`
- `Skeleton`
- `Empty`
- `NoticeBar`
- `Toast`
- `Dialog`
- `Notify`

### 弹层与浮层

- `Popup`
- `ActionSheet`
- `Popover`
- `Overlay`
- 页面级弹层挂载到 `PageShare` / `PageRoot`，不要放在滚动内容区，避免层级低于 `PageLayout` header/footer/tabbar。

### 资源与上传

- `Image`
- `ImagePreview`
- `Uploader`
- `Avatar`

## 页面场景优先映射

- 搜索页：优先使用项目组件 `AppSearchBar`，底层为 NutUI `SearchBar`；页面不要手写搜索输入框、清除按钮或搜索图标。
- 订单/优惠券/售后筛选：优先看 `Tabs`、`Cell`、`Popup`，再结合现有 `FilterTabs` / `StatusListTabs`。
- 日期选择：先查 `DateRangePanel`；如果业务需要更完整日历选择，再评估 NutUI `Calendar` / `DatePicker` 并封装。
- 弹层日历选择：优先使用 `DateSelectionPopup`，底层为 NutUI `Calendar`；门票用 `single`，酒店用 `range`。
- NutUI 组件样式默认依赖 `config/index.ts` 中的 `deviceRatio[375]=2`，不要用页面局部样式覆盖 `NaNrpx` 这类编译问题。
- 数量步进：先查 `QuantityStepper`；不要在页面里重复造加减器。
- 图片上传/评价晒单：优先看 `Uploader`，并先封装到项目组件。
- 详情须知、规则说明、筛选弹层：优先看 `Popup` / `Dialog` / `CellGroup` 组合。

## 不作为默认方案的组件

这些组件当前项目不建议页面直接使用：

- `NavBar`
  - 当前统一由 `PageNavbar` 和 `PageShell` 承接
- `Tabbar`
  - 当前统一由 `AppTabBar` 承接
- `SafeArea`
  - 安全区由 `PageLayout / layout` 统一承接
- `Image`
  - 页面真实图片统一用 `AppImage`
- `Icon`
  - 图标统一经 `AppIcon` 出口

## 使用提醒

- 用户没有明确要求完整组件库能力时，不要为了“更像组件库”强行替换已有项目封装。
- 同一个页面里只要已有项目组件能完成任务，就不要退回直接使用 NutUI 原组件。
- 页面里出现自定义 stepper、日期面板、提交栏、筛选 tabs 前，必须先查本清单和 `src/core/components/commerce`。
