# 2026-06-20 小程序商城闭环最终结论

## 最终结果

- 小程序商城首页、分类、列表、详情、收藏、购物车和确认单已经全部跑在真实 BFF 链路上。
- 商城相关去 mock 扫描与 UAT 真链路验收均已通过。
- 最终统一验收命令：`node scripts/accept-mall-closure.mjs`
- 最终通过时间：`2026-06-20 13:53 CST`

## 这轮最后的真实阻塞

- 最后一个阻塞不是小程序页面适配，而是 UAT `member-service` 收藏子链路缺少 `crm_member_favorite_product` 表。
- 补齐仓库里的 `V44__create_crm_member_favorite_product.sql` 后：
  - `GET /api/bff/mall/favorites` -> `200`
  - `POST /api/bff/mall/favorites` -> `200`
  - `DELETE /api/bff/mall/favorites/{productId}` -> `200`

## 当前验收口径

- 后台商品：`100`
- 内部只读商品：`100`
- 小程序首页聚合：`8 / 20 / 1 / 1`
- 小程序商品列表：`100`
- 收藏、购物车、确认单主链路全部 `200`
- `closure.closed = true`

## 运行时约束

- 商城页面只允许展示真实接口数据、真实空态或真实错误态。
- 商城收藏、购物车、评价、售后、物流与订单详情都不允许回退本地 mock。
- 当前物流仍只按第三方配送口径运行，没有自家物流。
