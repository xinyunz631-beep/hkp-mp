# UI 组件契约

本文件维护设计模块到当前 Taro 小程序代码组件的映射。新增页面优先复用这些基础件，不另造平行体系。

## 页面结构

- 页面容器：`PageShell`
- 固定 header/footer 与滚动区：`PageLayout`
- 自定义顶部导航：`PageNavbar`
- `PageNavbar` 默认左侧 icon 使用 NutUI `ArrowLeft`，标题水平居中，主包 tab 页仍只展示标题。
- 页面内底部导航：`AppTabBar`
- 页面运行时：`usePageRuntime` + `PageRuntimeHost`

## 状态与弹层

- 首屏 loading / 骨架：`src/core/components/loading`、`BaseSkeleton`
- 空状态：`BaseEmpty`
- 异常状态：`BaseException`、`StatusException`
- 登录弹窗：`LoginPopup`
- 通用弹层：`AppPopup`
- 登录动作拦截：`AuthAction` 或 `usePageRuntime().ensureLogin`

## 首页规范组件

- 固定顶部搜索栏：左侧双功能按钮 + 中间搜索输入区 + 右侧微信胶囊预留，作为 `固定导航` 独立层处理。
- 会员信息卡：白底大卡 + 等级 badge + 数据 chip + `4 x 2` 快捷入口，保持首屏服务聚合能力。
- 模块标题：左侧品牌点标 + 标题 + 右侧 `查看全部`，用于榜单、推荐、分类等运营区块。
- 内容卡片：统一白底、轻阴影、上图下文结构；真实图片在设计阶段一律先用 `接口图占位`。
- 宫格分类：`3` 列圆角图卡 + 底部粉色标签，适合“吃住行游购娱商学情”类入口。
- 页面内 TabBar：沿用 `AppTabBar` 的页面内 fixed 底部结构，中间主入口可以保留更强视觉按钮。

## 设计稿图层命名

Pencil / Figma 图层都要能让 Codex 读懂开发语义：

- `接口图占位`：图片由接口或 CDN 返回，代码只实现容器和占位。
- `代码渲染`：文本、按钮、标签、卡片、列表等由小程序代码渲染。
- `固定导航`：navbar、tabbar、吸顶区或安全区相关元素。
- `状态组件`：loading、empty、error、未登录、降级态。
- 当页面登记的 `currentTool` 改变时，图层命名规则不变，开发语义仍要保持可读。

## 页面组件拆分建议

- 主包 tab 页面仍放 `src/pages`。
- 业务重页面默认放对应 `src/pkg-*` 分包。
- 主包不得直接引用分包业务实现。
- 复杂页面可以先在页面内拆小组件，确认复用价值后再沉淀到 `src/core/components` 或分包组件。
