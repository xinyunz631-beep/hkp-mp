# UI Tokens

本文件记录设计侧使用的 token 语义。代码侧实际变量以 `src/styles/tokens.scss` 为准；设计稿和页面文档不得另起一套颜色、间距或圆角体系。

## 基准

- 设计画布：小程序页面统一按 `750px` 宽设计。
- 适配目标：微信小程序 `weapp`，不为了 H5 做陌生抽象。
- 页面背景：浅灰白为主，粉色仅用于品牌按钮、选中态、重点氛围。
- 动态图片：默认用中性灰占位，真实图片由接口或 CDN 提供。

## 当前代码 token

- 品牌主色：`$color-primary: #ec6d9c`
- 品牌浅色：`$color-primary-light: #fce7f3`
- 品牌按压：`$color-primary-pressed: #be185d`
- 页面背景：`$color-page-bg: #f6f8fb`
- 白色承载面：`$color-surface: #ffffff`
- 柔和承载面：`$color-surface-soft: #f8fafc`
- 主文本：`$color-text-primary: #1f2933`
- 次文本：`$color-text-secondary: #667085`
- 边框：`$color-border: #e5e7eb`
- 页面内 tabbar 高度：`$tabbar-height: 112px`
- 底部安全区占位：`$safe-bottom-spacer-height: 20Px`

## 首页规范补充

- 会员与权益点缀色建议：`#F5C451`，只用于会员等级、权益提醒和少量运营点缀，不进入全局主 token。
- 动态图片占位建议：`#E8EDF3`，统一作为 `接口图占位` 的底色。
- 首页推荐圆角：`24 / 32 / 40`，分别用于按钮与小卡片、列表卡片、主卡和大容器。
- 首页推荐间距：`12 / 16 / 24 / 32`，小标签和内部排版用小间距，模块与模块之间至少保留 `24px` 呼吸感。

## 设计约束

- 默认复用现有 token；确需新增 token 时，先更新本文件，再更新 `src/styles/tokens.scss`。
- 截图里的水印、系统外框、无效标题不进入设计稿。
- 字体层级要服务页面扫描效率，卡片和列表内不得使用 hero 级大字。
- 圆角、阴影和粉色面积要克制，避免所有页面变成单一粉色主题。
