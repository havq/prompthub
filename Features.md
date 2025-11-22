# 🚀 Prompthub - Danh Sách Tính Năng (Features List)

Chào mừng bạn đến với **Prompthub** - Nền tảng chia sẻ, khám phá và sáng tạo Prompt AI hàng đầu. Dưới đây là danh sách chi tiết tất cả các tính năng đã được tích hợp trong ứng dụng, từ trải nghiệm người dùng cơ bản đến các công cụ quản trị mạnh mẽ.

---

## 🌟 1. Khám Phá & Tìm Kiếm (Discovery)
Trải nghiệm duyệt nội dung mượt mà và thông minh.

*   **Giao diện Masonry Grid:** Hiển thị các thẻ Prompt dưới dạng lưới so le đẹp mắt, tối ưu hóa không gian hiển thị hình ảnh.
*   **Tìm kiếm thông minh (Debounced Search):** Tìm kiếm theo tiêu đề, nội dung prompt, thẻ tag (#) hoặc tên tác giả. Kết quả cập nhật ngay khi ngừng gõ.
*   **Bộ lọc đa dạng:**
    *   Lọc theo **Danh mục** (Categories).
    *   Lọc theo **Thẻ** (Tags) phổ biến.
    *   Lọc theo **Thời gian** (24h qua, 7 ngày, 30 ngày, toàn bộ).
    *   Lọc nâng cao: Có bình luận, Đã được Remix, Có ảnh tham khảo.
*   **Sắp xếp linh hoạt:** Mới nhất, Cũ nhất, Đánh giá cao nhất, Nhiều lượt xem nhất, Nhiều lượt thích nhất, Nhiều Remix nhất.
*   **Chế độ xem (View Modes):** Chuyển đổi giữa dạng Lưới (Grid), Danh sách (List), hoặc Thu gọn (Compact).
*   **Phân trang tùy chọn:** Hỗ trợ cả Phân trang truyền thống (Pagination) và Cuộn vô hạn (Infinite Scroll) (cấu hình trong Admin).
*   **Gợi ý Prompt tương tự (Similarity Search):** Tìm các prompt có nội dung tương tự dựa trên thuật toán phân tích văn bản.

## 🎨 2. Tương Tác & Cộng Đồng (Engagement)
Xây dựng cộng đồng sôi nổi và kết nối người dùng.

*   **Hệ thống Tài khoản:**
    *   Đăng ký/Đăng nhập qua Email & Mật khẩu.
    *   **Đăng nhập nhanh bằng Google** (Firebase Auth).
    *   Bảo vệ chống spam bằng **Google reCAPTCHA** (v2 & v3).
    *   Quên mật khẩu & Khôi phục qua email.
*   **Hồ sơ người dùng (Profile):**
    *   Ảnh đại diện (Avatar) & Ảnh bìa (Cover).
    *   Tiểu sử (Bio), Liên kết mạng xã hội.
    *   Thống kê: Số prompt, Người theo dõi, Đang theo dõi, Điểm kinh nghiệm (XP).
    *   Chụp ảnh trực tiếp từ Webcam để làm Avatar.
*   **Hệ thống Gamification (Trò chơi hóa):**
    *   **Cấp độ (Levels):** Tăng cấp dựa trên điểm tích lũy từ các hoạt động.
    *   **Huy hiệu (Badges):** Tự động mở khóa các huy hiệu (Người đóng góp đầu tiên, Top Rated, Pro Member, v.v.).
*   **Mạng xã hội:**
    *   Tính năng **Follow/Unfollow** tác giả yêu thích.
    *   **Bảng tin (Feed):** Chỉ hiển thị nội dung từ những người bạn theo dõi.
*   **Tương tác nội dung:**
    *   **Yêu thích (Favorite):** Lưu prompt vào danh sách yêu thích.
    *   **Đánh giá (Rating):** Chấm điểm 1-5 sao cho prompt.
    *   **Bình luận (Comments):** Hệ thống bình luận đa cấp (Reply), hỗ trợ nhắc tên (@mention).
    *   **Showcase:** Người dùng có thể tải lên kết quả ảnh họ tạo ra từ prompt của người khác để khoe tác phẩm.
    *   **Bộ sưu tập (Collections):** Tạo các thư mục cá nhân để lưu trữ và phân loại prompt (Riêng tư).
    *   **Báo cáo (Report):** Báo cáo nội dung vi phạm (Spam, NSFW, v.v.).

## ✍️ 3. Sáng Tạo & Đóng Góp (Creation)
Công cụ mạnh mẽ để chia sẻ ý tưởng.

*   **Gửi Prompt mới:**
    *   Hỗ trợ nhập Tiêu đề, Nội dung Prompt, URL ảnh/video.
    *   Tải ảnh lên: Hỗ trợ kéo thả, dán URL, hoặc tải lên trực tiếp (Server, ImgBB, Cloudinary, Tumblr).
    *   **Cắt ảnh (Image Cropping):** Tích hợp công cụ cắt ảnh trước khi tải lên.
    *   **Xoay ảnh:** Hỗ trợ xoay ảnh ngang/dọc.
    *   **Ảnh tham khảo (Reference Image):** Đính kèm ảnh mẫu cho prompt (ControlNet).
    *   Đánh dấu nội dung người lớn (**NSFW**).
    *   Chế độ **Riêng tư (Private)**: Chỉ mình tôi xem (Dành cho Pro).
*   **Remix Prompt:** Tạo bản sao từ một prompt có sẵn để chỉnh sửa và phát triển thêm. Hệ thống tự động ghi nhận nguồn gốc (Remixed From).
*   **AI Tools (Tích hợp Google Gemini):**
    *   **AI Prompt Generator:** Nhập ý tưởng thô, AI sẽ viết thành prompt chi tiết chuyên nghiệp.
    *   **AI Tag Suggestion:** Tự động đề xuất thẻ tag dựa trên nội dung prompt.

## 🎥 4. Reels (Video Ngắn) & Bài Viết (Posts)
Đa dạng hóa nội dung ngoài Prompt ảnh.

*   **Reels (Video ngắn):**
    *   Trải nghiệm lướt video dọc kiểu TikTok/Instagram Reels.
    *   Tự động phát khi cuộn tới.
    *   Thả tim, Bình luận, Chia sẻ.
    *   Liên kết trực tiếp với Prompt gốc (nếu có).
    *   Hỗ trợ tải lên video (Server, Cloudinary).
*   **Posts (Bài viết/Blog):**
    *   Soạn thảo bài viết dài (Hướng dẫn, Tin tức) với trình soạn thảo văn bản giàu tính năng (Quill Editor).
    *   Hỗ trợ ảnh bìa, danh mục bài viết riêng.

## 💎 5. Hệ Thống Pro & Kiếm Tiền (Monetization)
Mô hình kinh doanh tích hợp sẵn.

*   **Gói thành viên Pro:**
    *   Xóa quảng cáo.
    *   Tạo Prompt riêng tư.
    *   Quyền tải lên Video.
    *   Huy hiệu Pro độc quyền.
    *   Quyền truy cập sớm tính năng mới.
*   **Cổng thanh toán:**
    *   **SePay (Việt Nam):** Tự động xác nhận chuyển khoản ngân hàng qua QR Code.
    *   **PayPal (Quốc tế):** Thanh toán USD tự động.
*   **Quản lý Quảng cáo (Ads Manager):**
    *   Hỗ trợ nhiều vị trí: Trong lưới (In-grid), Banner đầu/cuối trang, Sidebar, Popup (Overlay).
    *   Quảng cáo xen kẽ trong Reels.
    *   Cấu hình tần suất hiển thị, vị trí bắt đầu, thời gian chờ.

## 🛠 6. Quản Trị Viên (Admin Dashboard)
Trung tâm điều khiển toàn bộ hệ thống.

*   **Dashboard Analytics:** Biểu đồ thống kê người dùng, prompt, lượt xem, xu hướng theo thời gian thực.
*   **Quản lý Nội dung:** Duyệt/Xóa/Sửa Prompts, Posts, Reels, Showcase.
*   **Quản lý Người dùng:** Xem danh sách, chỉnh sửa vai trò, cấm người dùng, cấp Pro thủ công.
*   **Quản lý Danh mục:** Tạo/Sửa/Xóa danh mục cho Prompt, Post, Reel.
*   **Hệ thống Báo cáo:** Xem và xử lý các báo cáo vi phạm từ cộng đồng.
*   **Cấu hình Hệ thống (Settings):**
    *   Chỉnh sửa Logo, Tên App, Mô tả.
    *   Cấu hình API (ImgBB, Cloudinary, Tumblr, Firebase, Gemini, PayPal, SePay).
    *   Tùy chỉnh Menu điều hướng (Header/Footer/Mobile).
    *   **Code Injection:** Chèn mã CSS/JS tùy chỉnh vào Head/Footer.
    *   **Watermark:** Tự động đóng dấu bản quyền lên ảnh tải lên.
    *   Nhập/Xuất dữ liệu (JSON).

## ⚙️ 7. Kỹ Thuật & UX (Technical)
Nền tảng vững chắc và hiện đại.

*   **Giao diện:**
    *   **Dark Mode / Light Mode:** Tự động theo hệ thống hoặc tùy chỉnh.
    *   **Responsive:** Tối ưu hoàn hảo cho Mobile, Tablet và Desktop.
*   **Đa ngôn ngữ (i18n):** Hỗ trợ Tiếng Việt, Tiếng Anh, Tiếng Trung, Tiếng Hàn.
*   **Hiệu suất:**
    *   Lazy loading hình ảnh.
    *   Tối ưu hóa kích thước ảnh qua Cloudinary URL transformation.
    *   Code-splitting (Tải trang nhanh hơn).
*   **Thông báo (Notifications):** Hệ thống thông báo thời gian thực (Real-time polling) cho mọi tương tác (Like, Comment, Follow...).
*   **Permalinks:** Cấu hình đường dẫn thân thiện SEO cho mọi loại nội dung.
*   **Cookie Consent:** Banner thông báo cookie tuân thủ quy định.

---
*File này được tạo tự động để tổng hợp các tính năng hiện có của Prompthub.*
