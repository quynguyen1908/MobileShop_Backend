# 📱🛒 Online Mobile Shop Application with AI Agent using RAG (NestJS + Next.js/React Native + PostgreSQL) - Backend Repository

## Mục lục
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Yêu cầu chức năng](#yêu-cầu-chức-năng)
- [Thiết kế cơ sở dữ liệu](#thiết-kế-cơ-sở-dữ-liệu)
- [CI / CD with Github Actions](#ci--cd-with-github-actions)
- [Containerize with Docker](#containerize-with-docker)
- [AI Agent](#ai-agent)
- [Cloud Hosting](#cloud-hosting)
- [Logging & Monitoring](#logging--monitoring)
- [Các tính năng khác](#các-tính-năng-khác)
- [Hướng dẫn cài đặt](#hướng-dẫn-cài-đặt)

---

## Kiến trúc hệ thống
- **Microservices**:
    - Sử dụng NestJS, Prisma, Postgres & RabbitMQ.
    - Xây dựng các service quản lý sản phẩm, voucher, đơn hàng, tài khoản khách hàng.
- **API Gateway**: Điểm truy cập duy nhất cho các client, hỗ trợ xác thực và phân quyền (JWT), cung cấp tài liệu API thông qua Swagger.
- **Cơ sở dữ liệu (PostgreSQL)**: Lưu trữ thông tin hệ thống.
- **Event & Messsage**: Sử dụng RabbitMQ để publish event và truyền message giữa các service.
- **AI Agent**: Sử dụng GPT-4 kết hợp với Retrieval-Augmented Generation (RAG) để tư vấn sản phẩm, so sánh sản phẩm, trả lời câu hỏi.

---

## Yêu cầu chức năng
- **Quản lý người dùng**: Quản lý thông tin khách hàng, nhân viên, hệ thống tích điểm.
- **Quản lý sản phẩm**: Quản lý thông tin sản phẩm, danh mục, mẫu mã.
- **Quản lý đơn hàng**: Quản lý danh sách đơn hàng, trạng thái thanh toán, giao hàng.
- **Quản lý voucher**: Quản lý thông tin voucher, phạm vi áp dụng.
- **Dashboard quản trị**: Thống kê, báo cáo, phân tích.

---

## Thiết kế cơ sở dữ liệu
![ERD](https://github.com/user-attachments/assets/aecf8e42-a67c-4a1d-8f81-923a10bbc5b6)
[Chi tiết sơ đồ ERD trên dbdiagram.io](https://dbdiagram.io/d/Mobile_Shop-68c9605f1ff9c616bdefc30b)
- **Thiết kế bảng**: Các bảng chính gồm `phone`, `order`, `customer`, `voucher`, `user`, ...
- **Migration & Quản lý schema**: Sử dụng Prisma để quản lý migration và schema tự động.

---

## CI / CD with Github Actions

[![PhoneStore CI](https://github.com/quynguyen1908/MobileShop_Backend/actions/workflows/ci.yml/badge.svg)](https://github.com/quynguyen1908/MobileShop_Backend/actions/workflows/ci.yml)

[![Docker Build](https://github.com/quynguyen1908/MobileShop_Backend/actions/workflows/docker-build.yml/badge.svg)](https://github.com/quynguyen1908/MobileShop_Backend/actions/workflows/docker-build.yml)

[![Deploy](https://github.com/quynguyen1908/MobileShop_Backend/actions/workflows/deploy.yml/badge.svg)](https://github.com/quynguyen1908/MobileShop_Backend/actions/workflows/deploy.yml)

---

## Containerize with Docker
- **Docker Compose**: api-gateway, auth-service, user-service, phone-service, order-service, payment-service, ai-service, postgres, rabbitmq, qdrant

---

## AI Agent
- **LLM**: OpenAI GPT-4.1-Mini.
- **Embeddings**:  OpenAI text-embedding-3-small.
- **Vector database**: Qdrant.
- **Kiến trúc**: Retrieval Augmented Generation (RAG): Cung cấp thông tin chính xác và cập nhật theo thời gian.
- **Các tính năng chính**: Đề xuất sản phẩm, hỗ trợ kỹ thuật, hỗ trợ so sánh, trả lời câu hỏi về chính sách. 
---

## Cloud Hosting
- **Google Cloud Platform**: Sử dụng OAuth API để xây dựng tính năng xác thực bằng Google.

---

## Logging & Monitoring
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Monitoring**: Prometheus + Grafana
- **Tracing**: Zipkin

---

## Các tính năng khác:
- **Circuit Breaker**: Bảo vệ hệ thống khỏi lỗi lan truyền bằng cách ngắt kết nối tạm thời khi phát hiện sự cố giữa các service.
- **Notification**: Tích hợp gửi thông báo qua Slack để cảnh báo sự kiện quan trọng hoặc lỗi hệ thống.
- **SMS Service**: Sử dụng Twilio để gửi tin nhắn SMS xác thực hoặc thông báo cho khách hàng.

## Hướng dẫn cài đặt

### 1. Clone repository
```bash
git clone https://github.com/quynguyen1908/MobileShop_Backend.git
cd MobileShop_Backend
```

### 2. Cài đặt dependency
```bash
npm install
```

### 3. Cấu hình environment

- Sửa `.env.example ` thành `.env`, thay các giá trị cần thiết.

### 4. Khởi động các service
```bash
docker compose up -d
```

### 5. Chạy migration và generate Prisma Client
```bash
npm run prisma:migrate:all
npm run prisma:generate:all
```

### 6. Truy cập hệ thống
- **API Gateway**: [API Gateway](http://localhost:3000)
- **Swagger Docs**: [Swagger Docs](http://localhost:3000/api/v1/docs)