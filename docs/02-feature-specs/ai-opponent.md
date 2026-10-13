# AI opponent

Practice đấu Trainer bot theo trophy; không thưởng trophy/chest. [Wildlife](https://wildlifestudios8986.zendesk.com/hc/en-gb/articles/12684746317201-What-is-the-Practice-Mode). Không có bằng chứng về selector độ khó hoặc thuật toán gốc; không suy tất cả opponent yếu trong ranked là bot.

## Utility AI thay thế — Proposed

Bot sử dụng cùng command validator, mana, hand và deck rules. Không đọc hand/seed tương lai đối thủ. Quan sát `public battlefield + own hand/resources`; reaction tick chỉ kích hoạt mỗi khoảng quyết định. Deck lấy từ archetype đã được designer kiểm tra, lọc theo unlocked cards/level budget, không random 14 lá thiếu synergy.

```text
each decisionTick:
  threats[lane] = estimate enemy time-to-castle and damage pressure
  legal = enumerate card × legal lane × sampled deployment positions
  add Wait, optional PaidDraw if rules allow
  for action in legal:
    score = preventedCastleDamage + counterValue + pushSupport
          + manaEfficiency - overcommitRisk - spellWaste - laneNeglect
    simulate short horizon on copied state when budget permits
  choose seeded softmax(score, temperature)
  enqueue chosen action through same server command path
```

MVP heuristic đủ; không cần LLM chạy trong battle. Planning compute budget Proposed ≤1ms/decision trong load target; profile rồi mới tăng horizon. Tactical information: HP, target tags, range, expected travel, spell immune flags và status expiry; chưa có stats thì dùng lab-only.

Độ khó web mới: Easy phản ứng800–1200ms, candidate subset và noise; Normal400–800ms; Hard200–400ms, horizon sâu hơn. Đây là giá trị **thử nghiệm**, không phải số đo Castle Crush và không tăng mana/HP để gian lận. Seedable để reproduce.

Acceptance: không illegal play qua10000 trận seed; không crash khi tay toàn high cost; giải quyết multi-lane threat; không cast heal fullHP khi còn action có lợi; win-rate monotonic theo difficulty với cùng deck bằng CI/bootstrap. So với bot gốc bằng phân phối reaction, mana waste, lane occupancy, không chỉ win-rate. Offline practice cần simulation cùng version, chi tiết kiến trúc WASM ở simulation-engine.
