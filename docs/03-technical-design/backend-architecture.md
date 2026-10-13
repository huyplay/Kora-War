# Backend Architecture

ASP.NET Core API application services gọi domain modules và repositories. Match actor dùng pure simulation, không query DB mỗi tick. `IContentCatalog` immutable cache, `IMatchScheduler`, `IResultSettlement`, `IWalletLedger`, `IReplayStore`, `IIdentityProvider` tách adapter.

Identity: guest session → link email/OIDC provider của sản phẩm mới; không sao chép OAuth app identity Wildlife. Account-link conflict cần proof sở hữu cả hai và explicit merge rule; không tự chọn profile trophy cao. Session cookie HttpOnly/Secure/SameSite, CSRF cho REST mutations, origin allowlist WSS; token join match TTL ngắn. Password nếu có dùng thư viện identity standard; không tự crypto.

Transactions ngắn: wallet row lock theo player/currency; idempotency unique; order khóa nhất quán playerId để tránh deadlock donation; retries bounded. PostgreSQL isolation không tự giải business idempotency; unique grant key là bắt buộc. [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

Background jobs: outbox dispatch, season settlement, chest availability derived từ timestamps, expired boosts/offers, session cleanup, replay retention. Không tạo timer hệ điều hành cho mỗi chest. Jobs có lease và unique checkpoint; restart an toàn.

Social: clan permissions leader/member, chat length/rate limits, report/mute, retention; donation transfer+gold/XP atomically theo rule config, không cho donor double donate vượt copies. Friendly invitation accept CAS để chỉ hai participants.

Operations: health/liveness tách readiness, version/contentHash trong diagnostics, structured correlation matchId/commandId, không log access token/payment details. Admin content publish có role và audit; imported catalog Unknown không được activate cho ranked. No auto DB schema synchronize production; migrations versioned, backup trước destructive changes.
