# XuatXu — Biết nguồn, hiểu bằng chứng

Bản Flask dành cho `https://xuatxu-web.onrender.com/`, cập nhật theo hai tài liệu hướng dẫn và gói FINAL v1.1 ngày 24/10/2026. Đây là dự án nông sản XuatXu; dự án mỹ phẩm Notrice trong `D:\leadingpage\xuatxu` được quản lý riêng.

## Nội dung

- Hai hồ sơ điểm bán: ENVY túi 1 kg và Zespri vàng hộp 4 quả. Ba thẻ nguồn + một khối phạm vi xác minh mỗi sản phẩm; bằng chứng và tuyên bố mở theo nhu cầu.
- Tám ảnh bìa: na, nho xanh, lê vàng, dưa vàng, măng cụt, bưởi, cam vàng và xoài. Chỉ là danh mục minh họa, không tự tạo hồ sơ xuất xứ/chứng nhận.
- 19 câu hỏi trả lời theo dữ liệu có nguồn. Chưa kết nối AI sinh câu trả lời. Câu ngoài phạm vi hướng dẫn chọn gợi ý.
- QR sản phẩm HTTPS; mô phỏng 5 hash SHA-256 ở trang riêng; giới thiệu nghiên cứu và lộ trình demo 90 giây.
- Không có mã lô/chứng từ thật theo lô, giao dịch blockchain hoặc kết quả thí điểm được tự tạo.

## Chạy local

```powershell
cd D:\leadingpage\Xuatxu_webdemo
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python app.py
```

Mở `http://127.0.0.1:5000`. Có thể đổi cổng bằng `$env:PORT='5055'`. QR mặc định vẫn trỏ tới Render HTTPS, không trỏ localhost. Không bật Flask debug khi triển khai public.

## Render

Repository: `caohuyen1312/Xuatxunguongoc.id.vn`, nhánh `main`.

- Build: `pip install -r requirements.txt`
- Start: `gunicorn --bind 0.0.0.0:$PORT app:app`
- `PUBLIC_BASE_URL=https://xuatxu-web.onrender.com`
- `FEEDBACK_FORM_URL`: tùy chọn, URL HTTPS của phiếu khảo sát thật do nhóm cung cấp. Khi chưa cấu hình, giao diện ghi rõ chưa có biểu mẫu; không thu phản hồi tạm hoặc báo đã lưu.

Đẩy mã lên nhánh kết nối và kiểm tra deployment hoàn tất trong Render. `render.yaml` mô tả cấu hình; cấu hình dịch vụ hiện có trong dashboard cần tương ứng. Không đưa `.env`, `venv`, khóa hoặc dữ liệu khảo sát chưa công bố vào repository.

QR mở `/#detail/P-ENVY-VICHI-01` và `/#detail/P-ZESPRI-VICHI-01`. Sau mỗi triển khai, mở trực tiếp hai link, tải lại, mở nguồn, hỏi đáp và giải mã QR.

## Sửa giao diện và dữ liệu

- `templates/index.html`: khung, điều hướng, footer, hộp thoại.
- `static/style.css`: giao diện xanh trầm/nền kem, khoảng cách và responsive.
- `static/fonts.css` + `static/fonts/`: Be Vietnam Pro và Lora tự lưu, không cần CDN.
- `static/app.js`: trang chủ/danh mục/hồ sơ/nguồn/hỏi đáp/QR/mô phỏng/giới thiệu.
- `app.py`: API đọc CSV, giới hạn nguồn, đáp án và QR.
- `data/SAN_PHAM.csv`: giữ product_id liên kết. Không lấy META lot_id làm mã lô.
- `data/PUBLIC_DISPLAY_CARDS.csv`: ba thẻ nội dung và một thẻ LIMIT mỗi hồ sơ.
- `data/BANG_CHUNG.csv`, `CLAIM_EVIDENCE.csv`, `NGUON_THAM_KHAO.csv`, `SOURCE_USAGE_STATUS.csv`: nội dung, nguồn và phạm vi tương ứng.
- `data/AI_HOI_DAP.csv`: câu hỏi/đáp án. Chọn theo product_id + qa_id hoặc câu nhập khớp đã chuẩn hóa. API không trả nội dung chỉ dẫn nội bộ AI_KIEN_THUC.
- `data/gallery.json`: tám ảnh bìa minh họa. Ảnh giữ nguyên từ tệp người dùng, CSS điều khiển khung hiển thị. Không thêm xuất xứ hoặc chứng nhận khi chưa có nguồn.
- `static/sources/`: ảnh gốc VICHI mở khi cần đọc nhãn; `static/images/`: ảnh chính và bìa.
- `tech_demo/`: 5 sự kiện/hash riêng, không dùng làm hành trình cho sản phẩm VICHI.

Giữ bản ZIP gốc trong hồ sơ nghiên cứu. Không nhập `ARCHIVE_LEGACY_DO_NOT_IMPORT`. Các bảng hành trình, ledger thực tế, lượt quét và phản hồi demo để rỗng theo gói FINAL. Nội dung định hướng nghiên cứu không phải xác nhận đã đạt hiệu quả thí điểm.

Quy trình cập nhật: nhận nguồn → xác định đúng biến thể → ghi nguồn/phạm vi/quyền sử dụng → duyệt nội dung → cập nhật CSV → kiểm thử → triển khai → lưu phiên bản. Sau khi thêm SKU có hồ sơ cần cập nhật ảnh, tên ngắn, thông tin nhanh và kiểm thử liên kết, không biến thẻ minh họa thành hồ sơ bằng cách chỉ đổi nhãn.

## Kiểm thử

```powershell
python -m unittest discover -s tests -v
python tech_demo/verify_demo.py
npm install
npx playwright install chromium
# Trong terminal khác đã chạy Flask tại 5055:
npm run test:browser
# Kiểm tra bản public sau deploy:
$env:TEST_BASE_URL='https://xuatxu-web.onrender.com'
npm run test:browser
```

Kết quả và ảnh màn hình: `test-results/`. Kiểm thử gồm tất cả 19 câu hỏi, câu ngoài phạm vi, nhầm SKU, 2 QR giải mã được, phát hiện sửa hash, tìm kiếm/lọc, nguồn ảnh, responsive 320–1440px. Kiểm thử browser dùng Chromium mô phỏng, không thay thế thao tác quét bằng điện thoại thật hoặc khảo sát người dùng tại VICHI.

## Rollback

Trong Render chọn deployment trước bản cập nhật và thực hiện Rollback, hoặc phục hồi commit trước trong Git rồi triển khai. Bản sao trước sửa cục bộ: `D:\leadingpage\artifacts\xuatxu-refresh\source-before.zip`. Đọc `DEMO_90_GIAY.md` để chuẩn bị trình bày.
