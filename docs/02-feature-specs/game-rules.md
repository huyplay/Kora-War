# Game Rules Specification

Luật original nằm trong [battlefield](../01-research/gameplay-analysis.md) và [card-system](card-system.md). Đây là contract để triển khai, không tự bổ sung luật gốc.

| Rule ID | Bất biến / điều kiện | Loại |
|---|---|---|
| R01 | Có đúng 2 participants, 3 lane, 2 castle HP pools | Confirmed tài liệu |
| R02 | Input hợp lệ tiêu mana theo thẻ và tạo effect/unit | Confirmed tài liệu; atomicity Proposed |
| R03 | Unit tiến về thành đối phương; mục tiêu trong tầm chặn tiến tùy policy | Confirmed mức mô tả; details U05 |
| R04 | Một castle về 0 → FINISHING; chốt kết quả chỉ một lần | Win condition Confirmed; ordering Proposed |
| R05 | Hai castle cùng lethal: cần original tie-break | Unknown; strict parity phải block |
| R06 | Overtime bắt đầu 240s, damage tự tăng theo thời gian | Confirmed support; curve Unknown |
| R07 | Practice không trophy/chest; Friendly không trophy/gold/chest | Confirmed support |
| R08 | Result từ server, không nhận winner client gửi | Proposed security |
| R09 | Animation/FPS không làm đổi kết quả | Proposed architecture |

## Ruleset và readiness

Mỗi ruleset có `id, schemaVersion, evidenceBaseline, contentHash, parameters, confidence, readiness`. Hai profile:

- `documented`: values có nguồn; unknown `null`; chỉ chạy scenario không phụ thuộc unknown hoặc báo `RULE_UNRESOLVED` rõ ràng.
- `lab`: explicit override có chủ sở hữu/decision ID; có thể chơi technical slice nhưng không tính parity. Ví dụ speed/range demo được phép thiết kế **sau research gate**, không ghi ngược vào catalog gốc.

Mọi match lưu ruleset hash. Config mới chỉ áp dụng match mới. Không áp bảng shop/economy demo lên account thật. Luật overtime và tie-break không thể giấu sau magic number.

Không xác nhận surrender/rematch/casual queue gốc. Khi làm feature web mới phải gắn Proposed và loại khỏi tử số original parity. Một disconnect không đồng nghĩa người chơi chủ động surrender.
