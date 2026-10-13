# Castle Crush research & web reimplementation dossier

**Ngày baseline nghiên cứu:13/10/2026. Ngôn ngữ: tiếng Việt. Trạng thái: hồ sơ nghiên cứu/thiết kế; chưa có game implementation.**

Bắt đầu bằng [Executive summary](00-executive-summary.md), [unknowns](01-research/unknowns-and-assumptions.md) và [roadmap](04-development/roadmap.md). Có42file Markdown theo cây yêu cầu, dữ liệuJSON để kiểmtra tựđộng,95hạngmụckhảosát,66candidatecards,7repođánhgiá,34battlecasesvà14caseweb/network. Đây khôngphảichứngnhận100%specification-ready:14gapcònOpen, chưa cólive6.8.0test/videotimestamp/enginebenchmark.

`Confirmed`, `Strongly Inferred`, `Unverified`, `Unknown` nói vềbằngchứng của gamegốc. `Proposed` làthiết kếwebmới. `Not started`, `Implemented`, `Verified`, `Blocked research` làtrạngtháicôngviệc; khôngđồngnhấtvớiconfidence. Historicalclaim khôngtựthànhcurrentfeature. Mọi publishedparityclaimphảiqua [acceptance](05-parity/acceptance-criteria.md).

## Cách dùng để bắt đầu triển khai

1. Chốt baseline/live access và hoàn tất evidence tasksR01–R10 cho slice. Giữ nguyênnull khi thiếu dữliệu.
2. Chạy renderer/WASMspikes theo ADR; chọnenginebằngreport, khôngtheothóiquen.
3. Thực hiện [backlog](04-development/task-backlog.md) theo dependencies,8–12verifiedcards trước, mở rộngdần.
4. MỗiPR cập nhật requirement→source→code→test→parity. Khôngcopy tên/asset thươngmại sangbảnpháthành.
5. Trướcpublicrelease chốt serverauthority,ledger/recovery,mobile/ops/assetrighs vàfullscopecoverage.

## Nghiên cứu

- [card-catalog](01-research/card-catalog.md)
- [combat-mechanics](01-research/combat-mechanics.md)
- [game-overview](01-research/game-overview.md)
- [gameplay-analysis](01-research/gameplay-analysis.md)
- [graphics-camera-analysis](01-research/graphics-camera-analysis.md)
- [original-ui-ux](01-research/original-ui-ux.md)
- [sources](01-research/sources.md)
- [unknowns-and-assumptions](01-research/unknowns-and-assumptions.md)
- [version-history](01-research/version-history.md)

## Đặc tả tính năng

- [ai-opponent](02-feature-specs/ai-opponent.md)
- [battle-state-machine](02-feature-specs/battle-state-machine.md)
- [card-system](02-feature-specs/card-system.md)
- [combat-system](02-feature-specs/combat-system.md)
- [economy](02-feature-specs/economy.md)
- [feature-inventory](02-feature-specs/feature-inventory.md)
- [game-rules](02-feature-specs/game-rules.md)
- [multiplayer](02-feature-specs/multiplayer.md)
- [progression](02-feature-specs/progression.md)
- [screen-flow](02-feature-specs/screen-flow.md)

## Thiết kế kỹ thuật

- [api-contracts](03-technical-design/api-contracts.md)
- [asset-pipeline](03-technical-design/asset-pipeline.md)
- [backend-architecture](03-technical-design/backend-architecture.md)
- [database-design](03-technical-design/database-design.md)
- [frontend-architecture](03-technical-design/frontend-architecture.md)
- [game-rendering](03-technical-design/game-rendering.md)
- [github-research](03-technical-design/github-research.md)
- [multiplayer-architecture](03-technical-design/multiplayer-architecture.md)
- [performance-plan](03-technical-design/performance-plan.md)
- [simulation-engine](03-technical-design/simulation-engine.md)
- [system-architecture](03-technical-design/system-architecture.md)
- [tech-stack-evaluation](03-technical-design/tech-stack-evaluation.md)

## Kế hoạch phát triển

- [deployment-plan](04-development/deployment-plan.md)
- [milestone-breakdown](04-development/milestone-breakdown.md)
- [risks-and-dependencies](04-development/risks-and-dependencies.md)
- [roadmap](04-development/roadmap.md)
- [task-backlog](04-development/task-backlog.md)
- [testing-strategy](04-development/testing-strategy.md)

## Đối chiếu parity

- [acceptance-criteria](05-parity/acceptance-criteria.md)
- [original-vs-web](05-parity/original-vs-web.md)
- [research-gaps](05-parity/research-gaps.md)

## Dữ liệu và kiểm tra

- [Source registry](data/source-registry.json), [feature inventory](data/feature-inventory.json), [card catalog](data/card-catalog.json).
- [Screen inventory](data/screen-inventory.json), [research gaps](data/research-gaps.json), [GitHub snapshots](data/github-repositories.json).
- [Backlog](data/task-backlog.json), [test cases](data/test-cases.json), [parity matrix](data/parity-matrix.json), [command schema](data/command.schema.json).
- Chạy từ root: `python scripts/validate_docs.py`. Kiểmtra cấu trúc,linksrelative,sourceIDs,nullreasons,IDs/dependencies vàtraceability; khôngthay gametests hoặcwebURLavailability.

Các script `build_*.py` là authoring scripts dùng cachelocal `.research/` để cậpnhậthồsơ; chạy `python scripts/build_index.py` tạo cảchuỗi. Cache đãgitignore, khôngđónggói nội dungnguồn/asset đểpháthành. Khôngcầncache đểđọcdocs hay chạy validator. SourceJSONgiữprovenance,khônglưu toànvăn hỗtrợ/wiki.
