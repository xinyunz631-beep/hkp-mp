# 小程序 BFF 必须接口目录迁移说明

本目录不再作为后端必补接口事实源，只保留迁移指针，避免旧链接失效。

后续所有小程序 `/api/bff/**` 必补接口文档统一维护在：

`admin-frontend/docs/codex/admin-api-requirements/mp-bff-requirements/`

## 当前事实源

| 文件 | 新位置 |
| --- | --- |
| 小程序 BFF 目录说明 | `admin-frontend/docs/codex/admin-api-requirements/mp-bff-requirements/README.md` |
| 小程序优惠券/K 币 BFF 必补清单 | `admin-frontend/docs/codex/admin-api-requirements/mp-bff-requirements/coupon-bff-required-interfaces-2026-06-16.md` |
| 2026-06-17 后端源码复核缺口 | `admin-frontend/docs/codex/admin-api-requirements/mp-bff-requirements/coupon-bff-required-interfaces-2026-06-17.md` |
| 全链路验收手册 | `admin-frontend/docs/codex/admin-api-requirements/mp-bff-requirements/coupon-full-chain-acceptance-runbook-2026-06-17.md` |
| 小程序路由接口映射 | `admin-frontend/docs/codex/admin-api-requirements/mp-bff-requirements/route-api-map.md` |

## 更新规则

- `$hk-api-mp` 发现后端缺字段、分页、状态流转、错误码、同源资产或验收用例时，写入 `admin-frontend/docs/codex/admin-api-requirements/mp-bff-requirements/`。
- 小程序项目只记录端内适配进度和本迁移指针，不再新增本目录下的字段级必补文档。
- 写入后必须提交并 push 到 `admin-frontend` 的 `feature/admin-business-platform` 分支，让后端 Codex 能从管理后台接口要求目录读取。
