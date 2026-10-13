"""Build the Vietnamese research dossier from reviewed evidence; no game code."""
from pathlib import Path
import json, re, hashlib

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs'
DATE = '2026-10-13'

def write(path, text):
    p = DOC / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text.strip() + '\n', encoding='utf-8')

def dump(path, obj):
    write(path, json.dumps(obj, ensure_ascii=False, indent=2))

sources = []
def source(id, title, url, kind, scope, date=None, access='read'):
    sources.append(dict(id=id,title=title,url=url,kind=kind,scope=scope,published_or_updated=date,accessed=DATE,access=access))

source('STORE-IOS','App Store US','https://apps.apple.com/us/app/castle-crush-clash-cards-game/id1060704812','primary','Store listing và lịch sử iOS')
source('APPLE-API','Apple Lookup API','https://itunes.apple.com/lookup?id=1060704812&country=us','primary','2016-11-09; 6.8.0 ngày 2026-08-24')
source('STORE-ANDROID','Google Play','https://play.google.com/store/apps/details?id=com.tfgco.games.strategy.free.castlecrush&hl=en','primary','Đúng package Wildlife; updated 2026-08-19; không thấy versionName trong bản đọc')
source('SITE','Website Castle Crush','https://castlecrushgame.com/','primary','Marketing; liên kết whitepaper; không xác nhận server đang chơi được')
WP='https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf'
source('WP21','Castle Crush Whitepaper v2.1',WP,'primary-historical','25 trang, ngữ cảnh 2022; tải trực tiếp thành công, web extractor lỗi; không phải changelog 2026',None,'downloaded-and-read')
for a in json.loads((ROOT/'.research/support.json').read_text(encoding='utf8')):
    source('SUP-'+str(a['id']),a['title'],a['html_url'],'primary-support','Chứng minh nội dung hỗ trợ; live build chưa đối chiếu',a['updated_at'])
wiki_pages=['Cards','Mana','Mana_Ritual','Bomb','Warrior','Orc_Warrior','Golem','Skull_King','Ice_Elemental',"Archer%27s_Tribe",'Spectre',"Archer%27s_Queen",'Shaman','Poison','Dark_Angel','Category%3ATroops','Category%3ALegendary_Cards','Castle','Castle_8']
for name in wiki_pages:
    source('WIKI-'+name,'Castle Crush Wiki: '+name,'https://castlecrush.fandom.com/wiki/'+name,'community','Search-index text đã đọc; direct access bị robots; version và đơn vị chưa xác minh',None,'search-index-only')
source('WIKI-DEPLOY','Karten / Kampfgrundlagen','https://castle-crush.fandom.com/de/wiki/Karten','community','Vùng đặt quân tối đa tới giữa sân, vùng tiến theo quân; chưa đo bản hiện tại',None,'search-index-only')
source('VIDEO-2026','Castle Crush New Video In 2026','https://www.youtube.com/watch?v=p5I6PyVzCK4','video-candidate','Chưa xem; timestamp=null; không dùng làm bằng chứng luật',None,'throttled')
source('VIDEO-2017','Skull King lets play','https://www.youtube.com/watch?v=jpw9rLEItis','video-candidate','Chưa xem; timestamp=null; cần kiểm tra bản và toàn trận',None,'search-only')
source('COMMUNITY-2026','Cộng đồng về trạng thái game','https://www.reddit.com/r/Castlecrush/comments/1qd0epg/what_happened_to_my_favourite_game/','community','Phản ánh trải nghiệm; không chứng minh đóng server hoặc thuật toán ghép trận','2026-01-14','search-index-only')
source('COMMUNITY-ENCHANTER','Deck discussion','https://www.reddit.com/r/Castlecrush/comments/1idi2e0','community','Tên Enchanter/Fire Elemental, không phải số liệu cân bằng','2025-01-30','search-index-only')
source('ART','Castle Crush Game Art Development','https://www.behance.net/gallery/50579681/Castle-Crush-Game-Art-Development','artist-candidate','Tìm thấy portfolio; chưa chứng minh runtime mesh/engine',None,'search-only')
tech = [
('TECH-THREE','Three.js InstancedMesh','https://threejs.org/docs/pages/InstancedMesh.html'),
('TECH-BABYLON','Babylon thin instances','https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances/'),
('TECH-BONES','Babylon skeleton performance','https://doc.babylonjs.com/features/featuresDeepDive/mesh/bonesSkeletons'),
('TECH-PHASER','Phaser documentation','https://docs.phaser.io/'),
('TECH-UNITY','Unity web browser compatibility','https://docs.unity.com/en-us/engine/6000.6/manual/platform-specific/webgl/intro/browsercompatibility'),
('TECH-REACT','React Effects','https://react.dev/learn/synchronizing-with-effects'),
('TECH-SIGNALR','SignalR configuration','https://learn.microsoft.com/en-us/aspnet/core/signalr/configuration?view=aspnetcore-10.0'),
('TECH-PG','PostgreSQL isolation','https://www.postgresql.org/docs/current/transaction-iso.html')]
for id,title,url in tech: source(id,title,url,'primary-technical','Khả năng nền tảng; không phải benchmark Castle Crush')
source('TECH-PLAYCANVAS','PlayCanvas engine','https://github.com/playcanvas/engine','primary-technical','README và license MIT; khả năng WebGL2/WebGPU, glTF, animation; chưa benchmark')
source('VIDEO-ORC-HORDE','Castle Crush CASTLE 9 + ORC HORDE','https://www.youtube.com/watch?v=SeyOBSo0DkE','video-candidate','Tên Orc Horde từ title/description tìm kiếm; chưa xem video, timestamp=null; không chứng minh stats','2018-06-12','search-index-only')
source('COMMUNITY-NFT-2026','Invalid Card error','https://www.reddit.com/r/Castlecrush/comments/1ql912e/invalid_card_error/','community','Báo cáo mất Ascended và lời nói về ngừng NFT/ACS; chưa có thông báo chính thức đối chiếu','2026-01-24','read')

def sup(n):
    return next(s['url'] for s in sources if s['id']=='SUP-'+str(n))
def link(n, label=None):
    s=next(s for s in sources if s['id']==n)
    return f"[{label or s['title']}]({s['url']})"

write('01-research/game-overview.md',f'''
# Định danh và tình trạng game

Mốc khảo sát: **13/10/2026 (Asia/Bangkok)**. Nghiên cứu công khai, không trích xuất mã/asset từ ứng dụng.

| Thuộc tính | Kết luận | Tin cậy / phạm vi |
|---|---|---|
| Chủ thể phát hành | Wildlife Studios, Inc.; thương hiệu cũ Fun Games For Free xuất hiện trên store | Confirmed, {link('STORE-IOS')} |
| iOS đầu tiên | 09/11/2016 theo releaseDate | Confirmed, {link('APPLE-API')} |
| Android đầu tiên | 20/06/2017 được directory thứ cấp đề cập; chưa có nguồn gốc đã đọc | Unverified; không dùng để suy luận gameplay |
| iOS mới nhất nhìn thấy | 6.8.0, 24/08/2026 | Confirmed tại storefront US/API, không đại diện mọi rollout |
| Android | Package `com.tfgco.games.strategy.free.castlecrush`, updated 19/08/2026; versionName `null` | {link('STORE-ANDROID')} |
| Nền tảng | Android, iPhone/iPad; store Android còn hiển thị Windows qua môi trường Google Play/Intel | Không phải bằng chứng có bản web |
| Hoạt động | Listing, website, support truy cập được | Confirmed sự hiện diện; đăng nhập/PvP server chưa thử |
| Engine gốc | `null` | Unknown; portfolio, clone Unity hoặc screenshot không chứng minh engine của sản phẩm |

Loại trừ game match-3 của Mibo (`com.mibo.CastleCrush`), Crush the Castle của Armor Games, Castle Clash và Clash Royale. Những sản phẩm này xuất hiện lẫn trong kết quả tìm kiếm.

Luồng kinh nghiệm đã được nguồn gốc mô tả: xây deck → đấu thời gian thực 1v1 → phá thành → trophy/chest → thu thập, nâng cấp thẻ → mở castle/league. Thành có một pool HP nối ba lane; chi tiết tại [gameplay](gameplay-analysis.md). Whitepaper nhắc kế hoạch PC 2023, không chứng minh kế hoạch đã được thực hiện. {link('WP21')} trang 3–8.

Không suy từ bình luận “dead game” rằng đã đóng server; cũng không suy từ cập nhật bugfix rằng mọi mode/NFT vẫn hoạt động. Cần kiểm chứng live build riêng.
''')

write('01-research/version-history.md',f'''
# Lịch sử phiên bản và baseline

| Mốc | Phát hiện | Trạng thái |
|---|---|---|
| 2016-11-09 | iOS releaseDate | Confirmed, {link('APPLE-API')} |
| Đầu 2022 | Whitepaper ghi 68 thẻ; kế hoạch blockchain/PC | Confirmed nội dung lịch sử, không phải thực trạng 2026 |
| 2022-06-03, 5.0.0 | Art reskin | Confirmed changelog iOS |
| 2022-08-15, 6.0.0 | Store ghi cải tiến/sửa lỗi; không tự gán ngày ra NFT cho phiên bản | Confirmed changelog |
| 2022-11-29, 6.3.0 | Sửa lỗi/cải tiến | Confirmed changelog |
| 2023-12-28, 6.3.5 | Sửa lỗi/cải tiến | Confirmed changelog |
| 2025-09-09, 6.3.12 | Sửa lỗi/cải tiến | Confirmed changelog |
| 2025-10-14, 6.4.0 | Thông báo quan trọng, không nêu chi tiết | Nội dung thay đổi Unknown |
| 2026-01 đến 08 | 6.5.x → 6.6.x → 6.7.0 → 6.8.0 | Store chủ yếu ghi tối ưu/sửa lỗi |

Nguồn changelog: {link('STORE-IOS')}. Android và iOS không được mặc định cùng version hoặc cùng thời điểm rollout.

Baseline định nghĩa:

- `CC-public-2026-10-13`: tổng hợp chứng cứ công khai tại ngày khảo sát, gồm tài liệu cũ; **không** phải bản binary đã test.
- `CC-ios-US-6.8.0`: ứng viên baseline live; cần ghi OS, locale, account level, mode, card level, Forge/NFT và quay màn hình.
- `WEB-lab-v0`: luật thử nghiệm do đội thiết kế, phải có nhãn riêng; không gọi là parity baseline.

Tính năng bị xóa: chưa có bằng chứng đủ mạnh để kết luận tính năng cụ thể đã bị xóa. Nội dung NFT/Founder, Forge, Championship vẫn có trên support; tồn tại trong live build là Unknown. Bảng cards trên wiki cũ không thể đại diện toàn bộ roster hiện tại.

Xung đột cần giữ lại: whitepaper mô tả giải đấu có thưởng theo số thắng và hoàn gems; support mô tả chỉ thưởng sau đủ 10 vòng và ưu đãi hoàn gems lần đầu. Dùng nhãn lịch sử cho whitepaper, cần live test trước đặc tả production. {link('WP21')} tr.11; [Championship]({sup(12684749806609)}).
''')

write('01-research/gameplay-analysis.md',f'''
# Battlefield và vòng lặp

## Luật có nguồn

Whitepaper tr.3–5 xác nhận 1v1 thời gian thực, ba lane nối hai thành, quân tự tiến và đánh đối tượng đầu tiên vào tầm; thành không tự bắn. Quân đến cuối lane đánh thành, HP thành dùng chung và trận kết thúc khi HP về 0. Tài liệu nói không hòa nhưng không công bố tie-break khi hai thành cùng hết HP. Khoảng trận 1–3 phút là mô tả thông thường, **không** phải hard timeout. {link('WP21')}.

```mermaid
flowchart LR
  A[Thành A / HP chung] --- L0[Lane 0: A tiến sang B]
  A --- L1[Lane 1: hai chiều]
  A --- L2[Lane 2: B tiến sang A]
  L0 --- B[Thành B / HP chung]
  L1 --- B
  L2 --- B
```

Diagram là logic, không phải scale đo đạc. Hình battlefield trong whitepaper tr.4 nhìn ngang: A trái, B phải, ba đường xếp theo chiều sâu. Không dùng ảnh quảng cáo nhìn từ sau lưng quân trên Google Play để suy camera chiến đấu.

| Tham số | Dữ liệu | Độ tin cậy |
|---|---|---|
| Số lane | 3 | Confirmed historical |
| Chiều dài/rộng, đơn vị world | `null` | Unknown |
| Vùng triển khai | Wiki nói tiến theo quân, tối đa giữa sân; spell có vùng khác | Unverified live; [nguồn]({next(s['url'] for s in sources if s['id']=='WIKI-DEPLOY')}) |
| Thành con/tower phòng thủ | Không thuộc mô hình hai thành tr.5 | Không nhập cơ chế tower của Clash Royale |
| Giao lane | Có thẻ nhiều lane theo wiki; đổi lane/range ngoại lệ chưa đo | Phải đặc tả từng ability |
| Overtime | Bắt đầu sau 4 phút; tự gây damage thành tăng dần | Confirmed support; hàm damage và cadence `null` |

Nguồn overtime: [Wildlife]({sup(12694401083537)}). Thuật toán đề xuất phải dùng `overtimeCurve` cấu hình, không tự coi linear/exponential là luật gốc.

## Thời gian và kinh tế trận

Whitepaper tr.5 ghi regen 0.5 mana/s, tăng 1 mana/s sau 45s; capacity khởi đầu 2, tối đa 12. Tr.4 ghi draw 7–10s trong khi tr.5 ghi 7s. Support tách **mana hiện có** và **crystals**; không giải thích initial draw có tính vào crystal hay double-card trigger không. Các con số lịch sử được lưu làm candidate, không đóng cứng thành số liệu hiện hành.

Support xác nhận bắt đầu tay 5 lá, tối đa 6, rút đồng thời hai bên; lá rút khi tay đầy bị mất; shuffle sau mỗi bộ 14; tay rỗng cho phép trả 5 mana rút thêm. [Draw/cycle]({sup(12684698308625)}).

Support mô tả double cards sau 5 lần rút, tay 5 chỉ nhận thêm 1; chưa rõ lá thứ hai có bị burn hay không tiêu thụ deck cursor. [Double cards]({sup(12684758851089)}). Ghi quan sát cần làm ở [gaps](unknowns-and-assumptions.md).

## Mô hình web đề xuất

Mỗi entity có `lane:0..2`, `x` fixed-point, `side`, `targetMask`, trạng thái và bộ chỉ số theo level. Chiều cao render và mesh không quyết định hit test. `DeploymentPolicy`, `TargetPolicy`, `DrawPolicy`, `OvertimePolicy` là module riêng theo ruleset để thay luật sau đo mà không thay renderer. Không có physics engine 3D trong simulation trừ khi một quan sát thật yêu cầu.
''')

write('01-research/graphics-camera-analysis.md',f'''
# Camera, hình ảnh và animation

## Bằng chứng đã quan sát

Đã đọc và render trang 4 whitepaper: sân nằm ngang, hai mặt thành ở hai đầu, lane xếp chồng theo chiều sâu, nhân vật có volume/shading, health bar và UI cards phủ màn hình. Đây là hình lịch sử, không đủ chứng minh mesh runtime hay camera hiện tại. Đã xem screenshot marketing Google Play: góc nhìn khác, không có đầy đủ HUD; không dùng để đo FOV. {link('WP21')} tr.4; {link('STORE-ANDROID')} phần Screenshots.

| Câu hỏi | Kết quả | Cách xác minh |
|---|---|---|
| Perspective hay orthographic | Unknown; các đường song song có thể do phối cảnh yếu hoặc tranh dựng sẵn | Track các cạnh lane trên frame game, fit homography, so sánh sai số |
| Góc nghiêng/FOV | `null` | Capture gameplay không crop + scene kích thước tương đối; không thể suy FOV duy nhất từ một ảnh |
| Camera cố định | Strongly Inferred từ bố cục tr.4, chưa xem chuỗi frame | Quay 3 trận đủ start/result và mọi arena |
| Mesh hay sprite nhân vật | Unknown | Kiểm tra biến thiên silhouette, parallax, self-occlusion trong walk/attack và skin |
| Terrain/thành | Unknown geometry; thấy shading và lớp chiều sâu | So camera shake và occlusion, không trích asset |
| Simulation gốc 2D/3D | Unknown | Hành vi lane không chứng minh implementation; logic lane scalar đủ cho web đề xuất |
| Lighting/shadows | Có cảm giác volume trong ảnh; runtime lighting Unknown | So frame đứng/yên/đánh, vùng bóng đổi hình |
| Spawn/hit/death/particles/shake/audio | Chưa đo duration/layer | Quay unit cô lập, ghi frame bắt đầu/kết thúc/đánh trúng |

Portfolio {link('ART')} là đầu mối art research; chưa đọc đầy đủ, không khẳng định studio dùng engine cụ thể.

## So sánh pipeline đề xuất

| Phương án | Hình ảnh | Công việc/rủi ro | Khi chọn |
|---|---|---|---|
| Full 3D camera tự do | Volume và parallax linh hoạt | Tốn art, culling, occlusion; camera tự do chưa được yêu cầu | Chỉ khi sản phẩm cần camera mới |
| Model 3D + camera cố định (2.5D) | Có chiều sâu, dễ đổi skin/scale và đồng bộ animation | Skinning, transparency, draw calls phải đo | Ứng viên ưu tiên cho slice |
| Blender pre-render → sprite atlas | Ánh sáng baked ổn định, renderer đơn giản | Atlas tăng theo góc/frame/skin; zoom lớn dễ nhòe | Mobile thấp và camera đã cố định |

2.5D ở đây mô tả trình bày, không phải kiểu simulation. Cả ba dùng cùng replay fixture. Không phương án nào đã được benchmark trong repo trống. Tạm chọn Babylon.js cho **thí nghiệm so sánh**, không chốt engine production. Three.js là đối chứng 3D; Phaser là đối chứng atlas. [Quyết định và gate](../03-technical-design/tech-stack-evaluation.md).

Tương đương cảm giác có thể đạt bằng silhouette, timing, scale và readability với asset mới. Không hứa pixel-identical khi phải dùng nhận diện riêng; functional parity phải đo hit timing, target và damage độc lập hình ảnh.
''')

gaps=[
('U01','P0','Live baseline / Android version','Listing không chứng minh server hoạt động','Cài bản store hợp pháp; ghi version, OS, locale; đăng nhập và hoàn tất 3 PvP'),
('U02','P0','Rút bài, double và crystals','WP 7–10s/7s; support 5 draws vs WP45s','Quay 60fps 10 trận; tay full/empty, draw trả phí, Extra Crystal ở12; ghi mana/cursor'),
('U03','P0','Vùng đặt quân','Chỉ wiki nói frontier','Grid thử 20 vị trí/lane, trước/sau quân chết, pushback và qua giữa sân'),
('U04','P0','Roster và stats mọi level','68 lịch sử; catalog wiki thiếu, có mâu thuẫn','Chụp toàn collection/build và detail mọi thẻ; đọc stat base/Forge/NFT; kiểm tra alias'),
('U05','P0','Target, collision và hit timing','Không biết tie/retarget/cooldown','Friendly battle scripted: hai mục tiêu ngang range, unit vượt nhau, target chết giữa projectile'),
('U06','P0','Overtime và cùng chết','Có 4 phút; chưa có damage curve/tie-break','10 trận overtime, hai HP bằng nhau; log tick damage và kết quả frame-by-frame'),
('U07','P1','Upgrade/XP/trophy/loot/reset','Không đủ bảng chi phí, rounding, odds','Ghi nhiều delta và từng level; không suy Elo hay drop rate từ vài chest'),
('U08','P1','Mode và social đang hoạt động','Support chủ yếu 2023','Kiểm tra nhiều mức account, full event cycle/season và locale'),
('U09','P1','NFT/Founder hiện hành','Tài liệu hiện diện không chứng minh marketplace hoạt động','Quan sát read-only UI/announcement; không giao dịch để nghiên cứu'),
('U10','P0','Camera/animation hiện hành','Chưa xem video có build','Thu capture 3 arena, 10 abilities, giấy phép chỉ tham chiếu'),
('U11','P0','Disconnect/reconnect/surrender','Không có đặc tả công khai đủ','Ngắt 5/15/30/60s trên hai client do mình kiểm soát'),
('U12','P0','Engine performance','Chưa benchmark','Chạy fixture giống nhau Babylon/Three/Phaser trên thiết bị thật'),
('U13','P1','AI nội bộ','Không công khai','Đề xuất utility bot; so phân phối hành động, không tuyên bố cùng thuật toán'),
('U14','P1','License assets/repo','Thiếu license hoặc asset terms khác code','Kiểm tra từng file/bundle, xin quyền nếu cần; không copy khi chưa rõ')]
dump('data/research-gaps.json',[dict(id=i,priority=p,topic=t,reason=r,method=m,status='Open') for i,p,t,r,m in gaps])
write('01-research/unknowns-and-assumptions.md','''
# Unknowns, mâu thuẫn và phương pháp đóng gap

`Confirmed` = đúng trong phạm vi nguồn đã đọc; `Strongly Inferred` = nhiều dấu hiệu nhưng chưa đo; `Unverified` = có lời khẳng định chưa kiểm chứng/nguồn mâu thuẫn; `Unknown` = chưa có dữ liệu. `Proposed` là thiết kế web mới, không phải cấp tin cậy về game gốc.

Không suy rằng bài support mới được crawl là luật mới. `updated_at` API có thể phản ánh sửa metadata: Unlocking castles API 2026 nhưng bản web đã đọc hiển thị 2023; giữ cả provenance, chưa kết luận thay luật.

| ID | Ưu tiên | Unknown | Vì sao | Thí nghiệm đóng gap |
|---|---|---|---|---|
'''+'\n'.join(f'| {i} | {p} | {t} | {r} | {m} |' for i,p,t,r,m in gaps)+'''

## Mâu thuẫn không được tự giải bằng suy đoán

- Mana wiki nói 8s và Extra Crystal thêm HP; support nói đạt 12 thì rút lá. Chỉ hành vi support có thể đưa vào profile documented, HP phụ vẫn Unknown.
- Bomb wiki phần văn bản cost 2, bảng cost 1; Dark Angel phần văn bản 7, bảng 6. Cả hai cost canonical `null`.
- Ice Elemental damage giảm đột ngột ở level 7; Archer's Tribe ghi Melee trái mô tả ranged. Giữ raw candidate riêng, không nhập runtime.
- Whitepaper Forge nói tăng level vĩnh viễn; support giải thích mở level cap rồi còn phải nâng bằng cards/gold. Đặc tả ưu tiên sự tách biệt cap và level.
- Whitepaper nói không hòa. Không biến simultaneous lethal thành hòa trong parity profile; phải tìm tie-break hoặc chặn gate parity.

Mỗi phép đo lưu: build, mode, 2 deck, level, skin/tier, Forge, castle HP, thời gian capture, URL/file hợp pháp, timestamp start/end, sai số frame, số lần lặp, reviewer. Dữ liệu chưa đủ không dùng để mở `verified-parity`.
''')

if __name__=='__main__':
    dump('data/source-registry.json',sources)
    print('Research foundation generated')
