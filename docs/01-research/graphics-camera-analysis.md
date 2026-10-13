# Camera, hình ảnh và animation

## Bằng chứng đã quan sát

Đã đọc và render trang 4 whitepaper: sân nằm ngang, hai mặt thành ở hai đầu, lane xếp chồng theo chiều sâu, nhân vật có volume/shading, health bar và UI cards phủ màn hình. Đây là hình lịch sử, không đủ chứng minh mesh runtime hay camera hiện tại. Đã xem screenshot marketing Google Play: góc nhìn khác, không có đầy đủ HUD; không dùng để đo FOV. [Castle Crush Whitepaper v2.1](https://castle-crush-crypto-bucket.s3.amazonaws.com/whitepaper/Castle%20Crush%20Whitepaper%20v2.1.pdf) tr.4; [Google Play](https://play.google.com/store/apps/details?id=com.tfgco.games.strategy.free.castlecrush&hl=en) phần Screenshots.

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

Portfolio [Castle Crush Game Art Development](https://www.behance.net/gallery/50579681/Castle-Crush-Game-Art-Development) là đầu mối art research; chưa đọc đầy đủ, không khẳng định studio dùng engine cụ thể.

## So sánh pipeline đề xuất

| Phương án | Hình ảnh | Công việc/rủi ro | Khi chọn |
|---|---|---|---|
| Full 3D camera tự do | Volume và parallax linh hoạt | Tốn art, culling, occlusion; camera tự do chưa được yêu cầu | Chỉ khi sản phẩm cần camera mới |
| Model 3D + camera cố định (2.5D) | Có chiều sâu, dễ đổi skin/scale và đồng bộ animation | Skinning, transparency, draw calls phải đo | Ứng viên ưu tiên cho slice |
| Blender pre-render → sprite atlas | Ánh sáng baked ổn định, renderer đơn giản | Atlas tăng theo góc/frame/skin; zoom lớn dễ nhòe | Mobile thấp và camera đã cố định |

2.5D ở đây mô tả trình bày, không phải kiểu simulation. Cả ba dùng cùng replay fixture. Không phương án nào đã được benchmark trong repo trống. Tạm chọn Babylon.js cho **thí nghiệm so sánh**, không chốt engine production. Three.js là đối chứng 3D; Phaser là đối chứng atlas. [Quyết định và gate](../03-technical-design/tech-stack-evaluation.md).

Tương đương cảm giác có thể đạt bằng silhouette, timing, scale và readability với asset mới. Không hứa pixel-identical khi phải dùng nhận diện riêng; functional parity phải đo hit timing, target và damage độc lập hình ảnh.
