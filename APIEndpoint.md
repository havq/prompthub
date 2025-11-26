# Danh sách API Endpoint

Toàn bộ các request đều được gửi về file gốc `api.php` thông qua tham số GET `resource`.
**Base URL:** `/api.php` (hoặc URL cấu hình trong settings).

---

## 1. Xác thực (Authentication)
**Resource:** `auth`

| Method | Action (GET param) | Body / Params | Mô tả | Auth |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `login` | `{ identifier, password }` | Đăng nhập bằng Email hoặc Username. | Không |
| `POST` | `register` | `{ username, email, password }` | Đăng ký tài khoản mới. | Không |
| `POST` | `google` | `{ accessToken }` | Đăng nhập/Đăng ký bằng Google OAuth. | Không |
| `POST` | `forgot_password` | `{ email }` | Gửi email chứa link reset mật khẩu. | Không |
| `POST` | `reset_password` | `{ uid, token, newPassword }` | Đặt lại mật khẩu mới. | Không |
| `GET` | `verify` | *(Header: Authorization)* | Xác thực token hiện tại và lấy thông tin user mới nhất. | Có |

---

## 2. Prompts (Ảnh)
**Resource:** `prompts`

| Method | Action | Body / Params | Mô tả | Auth |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | - | `page`, `limit`, `sortBy`, `category`, `searchTerm`, `tag`, `author`, `date`, `filters...` | Lấy danh sách prompts (có phân trang, lọc). | Không |
| `GET` | - | `id={id}` | Lấy chi tiết một prompt cụ thể. | Không |
| `POST` | - | `{ title, text, imageUrl, categoryIds, ... }` | Tạo prompt mới. | Có |
| `POST` | `remix` | `originalPromptId={id}` + Body `{ ... }` | Tạo prompt mới dựa trên prompt cũ (Remix). | Có |
| `POST` | `increment_view` | `id={id}` | Tăng lượt xem cho prompt (không cần body). | Không |
| `PUT` | - | `id={id}` + Body `{ ... }` | Cập nhật thông tin prompt. | Có (Owner/Admin) |
| `DELETE` | - | `id={id}` | Xóa prompt. | Có (Owner/Admin) |

---

## 3. Posts (Bài viết)
**Resource:** `posts`

| Method | Action | Body / Params | Mô tả | Auth |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | - | `page`, `limit`, `sortBy`, `category`, `searchTerm` | Lấy danh sách bài viết. | Không |
| `GET` | - | `id={id}` | Lấy chi tiết bài viết. | Không |
| `GET` | `sidebar_data` | - | Lấy dữ liệu cho sidebar (bài nhiều view, tags). | Không |
| `GET` | `get_tags` | - | Lấy danh sách tất cả tags của bài viết. | Không |
| `POST` | - | `{ title, content, imageUrl, ... }` | Tạo bài viết mới. | Có |
| `POST` | `increment_view` | `id={id}` | Tăng lượt xem bài viết. | Không |
| `PUT` | - | `id={id}` + Body `{ ... }` | Cập nhật bài viết. | Có (Owner/Admin) |
| `DELETE` | - | `id={id}` | Xóa bài viết. | Có (Owner/Admin) |

---

## 4. Reels (Video ngắn)
**Resource:** `reels`

| Method | Action | Body / Params | Mô tả | Auth |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | - | `page`, `limit`, `searchTerm`, `category` | Lấy danh sách reels. | Không |
| `GET` | - | `id={id}` | Lấy chi tiết reel. | Không |
| `POST` | - | `{ title, videoUrl, categoryIds, tags, ... }` | Tạo reel mới. | Có |
| `POST` | `like` | `id={id}` | Thích hoặc bỏ thích reel. | Có |
| `POST` | `view` | `id={id}` | Tăng lượt xem reel. | Không |
| `PUT` | - | `id={id}` + Body `{ ... }` | Cập nhật reel. | Có (Owner/Admin) |
| `DELETE` | - | `id={id}` | Xóa reel. | Có (Owner/Admin) |

---

## 5. Người dùng (Users)
**Resource:** `users`

| Method | Action | Body / Params | Mô tả | Auth |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | - | - | Lấy danh sách tất cả người dùng (Admin thấy full, User thấy public). | Có |
| `GET` | - | `uid={uid}` | Lấy profile người dùng theo UID. | Không |
| `GET` | - | `username={username}` | Lấy profile người dùng theo Username. | Không |
| `GET` | `top_contributors` | - | Lấy danh sách người dùng có điểm cao nhất. | Không |
| `POST` | - | `{ username, email, ... }` | Tạo người dùng (Dành cho Admin). | Có (Admin) |
| `POST` | `lookup_username` | `{ username }` | Tìm thông tin user (Admin dùng để tặng quà/quản lý). | Có |
| `POST` | `follow` | `{ currentUserId, targetUserId }` | Theo dõi người dùng khác. | Có |
| `POST` | `unfollow` | `{ currentUserId, targetUserId }` | Bỏ theo dõi người dùng khác. | Có |
| `PUT` | - | `uid={uid}` + Body `{ ... }` | Cập nhật thông tin profile (Avatar, Bio, Settings...). | Có (Owner/Admin) |
| `DELETE` | - | `uid={uid}` | Xóa người dùng. | Có (Admin) |

---

## 6. Tải lên (Upload)
**Resource:** `upload`

| Method | Action | Params | Mô tả | Auth |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | - | `provider=server` (default) | Upload file lên Server cục bộ. | Có |
| `POST` | - | `provider=cloudinary` | Upload file lên Cloudinary (qua Proxy Server). | Có |
| `POST` | - | `provider=tumblr` | Upload file lên Tumblr (qua Proxy Server). | Có |
| `POST` | `generate-r2-presigned-url` | Body `{ fileName, contentType, configId }` | Tạo URL upload trực tiếp lên Cloudflare R2. | Có |

---

## 7. Tương tác & Cộng đồng
### Bình luận (Prompts, Posts, Reels)
**Resources:** `comments`, `post_comments`, `reel_comments`

| Method | Resource | Params | Mô tả | Auth |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `comments` | `promptId={id}` | Lấy bình luận của prompt. | Không |
| `GET` | `comments` | `action=counts` | Lấy tổng số lượng bình luận cho tất cả prompt. | Không |
| `GET` | `post_comments` | `postId={id}` | Lấy bình luận của post. | Không |
| `GET` | `reel_comments` | `reelId={id}` | Lấy bình luận của reel. | Không |
| `POST` | *All* | Body `{ text, parentId, ... }` | Tạo bình luận mới. | Có |
| `POST` | `reel_comments` | `id={id}&action=like` | Thích bình luận (chỉ cho Reel). | Có |
| `PUT` | *All* | `id={id}` + Body `{ text }` | Sửa nội dung bình luận. | Có (Owner/Admin) |
| `DELETE` | *All* | `id={id}` | Xóa bình luận. | Có (Owner/Admin) |

### Showcase (Khoe ảnh)
**Resource:** `showcase_images`

| Method | Params | Mô tả | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | - | Lấy tất cả ảnh showcase mới nhất. | Không |
| `GET` | `promptId={id}` | Lấy ảnh showcase của một prompt cụ thể. | Không |
| `GET` | `action=counts` | Đếm số lượng showcase cho mỗi prompt. | Không |
| `POST` | - | Upload ảnh showcase mới cho prompt. | Có |
| `DELETE` | `id={id}` | Xóa ảnh showcase. | Có (Owner/Admin) |

### Bộ sưu tập (Collections)
**Resource:** `collections`

| Method | Params | Mô tả | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `userId={uid}` | Lấy danh sách bộ sưu tập của người dùng. | Có |
| `POST` | - | Tạo bộ sưu tập mới HOẶC Thêm/Xóa prompt (dựa vào body). | Có |
| `PUT` | `id={id}` | Đổi tên bộ sưu tập. | Có |
| `DELETE` | `id={id}` | Xóa bộ sưu tập. | Có |
| `GET` | `action=mappings` | Lấy thống kê số lượng prompt trong collections. | Không |

### Yêu thích & Đánh giá
**Resources:** `favorites`, `ratings`

| Method | Resource | Params | Mô tả | Auth |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `favorites` | `userId={uid}` | Lấy danh sách ID các prompt đã thích. | Có |
| `POST` | `favorites` | Body `{ promptId }` | Thích một prompt. | Có |
| `DELETE` | `favorites` | `promptId={id}` | Bỏ thích prompt. | Có |
| `GET` | `ratings` | `action=combined` | Lấy điểm đánh giá trung bình & đánh giá của user. | Không |
| `POST` | `ratings` | Body `{ promptId, rating }` | Gửi đánh giá sao (1-5). | Không (Check IP/User) |

---

## 8. Hệ thống & Cài đặt
**Resources:** `settings`, `categories`, `post_categories`, `reel_categories`, `staticPages`, `reports`, `analytics`, `recaptcha`

| Method | Resource | Mô tả | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `settings` | Lấy cài đặt (Admin thấy full keys, User thấy public keys). | Không |
| `PUT` | `settings` | Lưu cài đặt hệ thống. | Có (Admin) |
| `CRUD` | `categories` | Quản lý danh mục Prompt. | Admin (trừ GET) |
| `CRUD` | `post_categories` | Quản lý danh mục Post. | Admin (trừ GET) |
| `CRUD` | `reel_categories` | Quản lý danh mục Reel. | Admin (trừ GET) |
| `CRUD` | `staticPages` | Quản lý các trang tĩnh (About, Terms...). | Admin (trừ GET) |
| `GET` | `reports` | Lấy danh sách báo cáo vi phạm. | Có (Admin) |
| `POST` | `reports` | Gửi báo cáo mới. | Có |
| `PUT` | `reports` | Cập nhật trạng thái báo cáo. | Có (Admin) |
| `DELETE` | `reports` | Xóa báo cáo. | Có (Admin) |
| `GET` | `analytics` | Lấy thống kê (Views, Likes, Remixes) của user. | Có (Owner/Admin) |
| `POST` | `recaptcha` | Verify token reCAPTCHA từ client. | Không |

---

## 9. Hỗ trợ & Thanh toán
**Resources:** `support_tickets`, `support_messages`, `rewards`, `sepay`, `paypal`

| Method | Resource | Action | Mô tả | Auth |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `support_tickets` | - | Lấy danh sách phiếu hỗ trợ. | Có |
| `POST` | `support_tickets` | - | Tạo phiếu hỗ trợ mới. | Có |
| `PUT` | `support_tickets` | - | Cập nhật trạng thái phiếu (Open/Closed). | Có |
| `DELETE` | `support_tickets` | - | Xóa phiếu hỗ trợ. | Có (Admin) |
| `GET` | `support_messages` | - | Lấy nội dung tin nhắn trong phiếu. | Có |
| `POST` | `support_messages` | - | Gửi tin nhắn trả lời trong phiếu. | Có |
| `POST` | `rewards` | `redeem_pro` | Đổi điểm tích lũy lấy gói Pro. | Có |
| `POST` | `sepay` | `create_payment` | Tạo link thanh toán SePay. | Có |
| `POST` | `sepay` | `verify_payment` | Xác thực thanh toán SePay từ client. | Không |
| `POST` | `sepay` | `ipn` | Webhook nhận thông báo từ SePay. | Không |
| `POST` | `paypal` | `create-order` | Tạo đơn hàng PayPal. | Có |
| `POST` | `paypal` | `capture-order` | Hoàn tất thanh toán PayPal. | Có |
