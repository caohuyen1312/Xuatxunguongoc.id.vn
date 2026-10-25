# MÔ PHỎNG KỸ THUẬT RIÊNG – KHÔNG PHẢI TRUY XUẤT VICHI

- `DEMO_EVENTS.csv`: đúng **5 sự kiện giả định** của **một nông sản giả định**; không gắn với ENVY hoặc Zespri.
- `DEMO_HASH_CHAIN.csv`: 5 hash SHA-256 liên tiếp. **Không có** giao dịch blockchain, transaction ID hay block explorer.
- `verify_demo.py`: lệnh `python verify_demo.py` để xác nhận hash có thể tái tính và mắt xích không đứt. Thử sửa nội dung JSON trong một ô `canonical_payload` rồi chạy lại để quan sát FAIL.
- Chuỗi hash dùng `SHA256(previous_hash + "|" + canonical_payload)` với JSON chuẩn hóa bằng `json.dumps(sort_keys=True, ensure_ascii=False, separators=(",", ":"))`.
- Không chép các file này vào thư mục `03_CSV_READY/data/` hoặc dùng làm nguồn cho hai hồ sơ sản phẩm VICHI. Nếu trình diễn, hãy tách rõ tab **“Mô phỏng kỹ thuật”**.
- `ARCHIVE_LEGACY_DO_NOT_IMPORT/` giữ bộ dữ liệu giả lập cũ để tham khảo, tuyệt đối không đưa vào hồ sơ sản phẩm thật.
