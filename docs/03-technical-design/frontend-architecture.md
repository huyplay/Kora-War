# Frontend Architecture

```text
web/src/
  app/            routes, providers, error boundary
  features/       lobby, decks, collection, shop, clan, progression
  battle/         input adapter, interpolation buffer, audio, HUD bridge
  renderer/       engine adapter, asset cache, animation/VFX views
  network/        protocol codecs, reconnect, receipt cache
  offline/        WASM worker adapter (conditional gate)
contracts/        generated JSON/TS contracts from schema
```

`BattleRenderer.mount(canvas, manifest)`, `applySnapshot(snapshot)`, `applyEvents(events)`, `resize(viewport)`, `dispose()`. Renderer không gọi reward API và không trừ mana. UI subscribe derived HUD tối đa10Hz trừ input immediate; entity transforms mutable render arrays, không React render60Hz.

NetworkState gồm serverTick, baselineId, ownPrivateState, publicState, ackedInputSeq, contentHash. Interpolation ring buffer tách previous/current snapshots, entity generation tránh lerp unit cũ qua unit mới. Spawn/death dùng eventId dedup; snapshot loss có resync.

React effects mount engine/socket subscriptions với cleanup, StrictMode không tạo hai loop. [React effect lifecycle](https://react.dev/learn/synchronizing-with-effects). Khi rời battle: release pointer capture, cancel RAF, dispose scene/material/texture theo refcount, stop audio nodes, unsubscribe network, terminate worker nếu không tái dùng.

IndexedDB chỉ lưu setting, manifest cache, downloaded practice/replay assets. Account currency/deck official đến từ API; cache local có server revision không có quyền settle. Asset URLs content-addressed, lazy-load extras; ServiceWorker không cache POST/auth/results và không thay phiên bản giữa match. Renderer fallback: context lost hiện reconnect overlay, recreate GPU resources từ snapshot, không restart server match.
