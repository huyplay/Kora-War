# Acceptance criteria và release claims

Research dossier hoàn thành về cấu trúc khi đủ42file Markdown theo yêu cầu, sources có URL/date/access,95inventoryrows có confidence, cardunknown có nullreason,7repo có SHA/weightedscore/license, đầy đủspec/diagram/backlog/testplan. **Điều đó chưa chứng minh nghiên cứu đủ để implement100%gamegốc.** Mỗi gate bên dưới cần report thực hiện riêng.

| Gate | Điều kiện pass | Bằng chứng bắt buộc |
|---|---|---|
| G-R baseline | Build/mode/timeframe và mandatory feature set đã đóng; allP0 của slice có rules/parameters/edgeoracle | Capture manifest, resolved conflict log, source provenance |
| G-C catalog | Mọi card trong slice có stats/units/levels/abilities/targets/costs đủ; missing card không được silently default | Validator report + reviewed observed tables |
| G-S sim | Fixed-step deterministic, event ordering/tie rules known; no FPS-dependent result | Golden traces, runtime hash comparison, T/N reports |
| G-V playable MVP | First-time touch flow→full battle→result→retry; subset và labdeviations hiện rõ | Browser build + recorded E2E + crash/leak checks |
| G-P PvP | Trusted server toàn combat; auth/private views; reconnect/resync; result một lần | Two-client network/security/concurrency reports |
| G-E economy | No negative balances/double rewards; authoritative prices/progression; exact verified tables | Ledger reconciliation + fault injection + contentreview |
| G-F full functionality | Mọi verified mandatory requirement implemented; account/meta/social/modes trong baseline đủ | Requirement-level trace matrix, no silent omissions |
| G-M mobile/performance | B0/device matrix đạt target tại quality đã công bố; no leaked contexts/thermalcollapse | Raw benchmark artifacts; regression baseline |
| G-O operations | Backup restore/migration/rollback/drain/rate-limit/monitoring hoạt động | Rehearsal logs, measured capacity/RPO/RTO |
| G-L assets | Toàn bộ code/asset có quyền sử dụng phù hợp, nhận diện phát hành riêng | License manifest + attribution + original asset sources |
| G-100 parity claim | Denominator fixed, mọi observable required behavior đã pass original-vs-web, zero opencriticalgap | Independent review + repeatable differential fixtures |

Status progression: Not started→In progress→Implemented (self tests pass)→Verified (differential oracle pass). Blocked research, Not applicable và Intentional deviation là trạng thái riêng; deviation không tínhpass. Removedfeature cần official/currentevidence, không tự xóa denominator vì khó làm. Historicalbaseline đượcphép nếu đặt tên rõ và người dùng hiểu không phải latest.

Quy tắc kiểm chứng: số nguyên damage/cardcount/mana exact; timing/geometry tolerance được thiết lập từ đo vàresolution, ghi trước khi test; fail nếu đổiwinner/validaction/order. Visualmatch đánh giá readability/timing/newidentity, không buộccopytrái phép. QA saupatch phải tái verify impactedrules/cards,không giữ nhãnVerified từbaselinecũ.

Hiện tại: structural docs có thể kiểm tra bằng `python scripts/validate_docs.py`; game gates G-R..G-100 **chưa pass**. Không gọi library build thànhcông là browserplayable, không gọi selectedfileaudit là securityaudit, không gọichưa cóbugreport làbugfree.
