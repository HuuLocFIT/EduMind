# Hướng Dẫn Docker cho EduMind Platform

Tài liệu này hướng dẫn cách build và chạy các Docker images cho các microservices của EduMind Platform.

## 📋 Mục Lục

- [Tổng Quan](#tổng-quan)
- [Yêu Cầu](#yêu-cầu)
- [Cấu Trúc Docker](#cấu-trúc-docker)
- [Build Docker Images](#build-docker-images)
- [Chạy với Docker Compose](#chạy-với-docker-compose)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## 📦 Tổng Quan

Dự án sử dụng Docker để containerize các microservices:

- **discovery-service** (Port 8761): Eureka Server cho service discovery
- **api-gateway** (Port 8080): Spring Cloud Gateway
- **auth-service** (Port 8081): Authentication & Authorization service
- **postgres-auth** (Port 5432): PostgreSQL database
- **redis** (Port 6379): Redis cho rate limiting

## 🔧 Yêu Cầu

- Docker Engine >= 20.10
- Docker Compose >= 2.0
- Maven >= 3.9 (để build images)
- Java 21 (để build local nếu cần)

Kiểm tra version:
```bash
docker --version
docker compose version
```

## 📁 Cấu Trúc Docker

```
backend/
├── docker-compose.yml          # Orchestration cho tất cả services
├── .dockerignore               # Files/folders bỏ qua khi build
├── discovery-service/
│   └── Dockerfile              # Dockerfile cho discovery-service
├── api-gateway/
│   └── Dockerfile              # Dockerfile cho api-gateway
└── auth-service/
    └── Dockerfile              # Dockerfile cho auth-service
```

## 🏗️ Build Docker Images

### Cách 1: Build từng service riêng lẻ

Build từ thư mục `backend/`:

```bash
# Build discovery-service
docker build -f discovery-service/Dockerfile -t edumind/discovery-service:latest .

# Build api-gateway
docker build -f api-gateway/Dockerfile -t edumind/api-gateway:latest .

# Build auth-service
docker build -f auth-service/Dockerfile -t edumind/auth-service:latest .
```

### Cách 2: Build tất cả với docker-compose

```bash
# Build tất cả images
docker compose build

# Build lại từ đầu (không dùng cache)
docker compose build --no-cache

# Build một service cụ thể
docker compose build discovery-service
```

### Kiểm tra images đã build

```bash
docker images | grep edumind
```

Kết quả mong đợi:
```
edumind/discovery-service   latest    ...    ...    ...
edumind/api-gateway         latest    ...    ...    ...
edumind/auth-service        latest    ...    ...    ...
```

## 🚀 Chạy với Docker Compose

### Bước 1: Tạo file .env

Tạo file `.env` trong thư mục `backend/` với các biến môi trường cần thiết:

```bash
# Database
AUTH_DB_NAME=edumind_auth
AUTH_DB_USERNAME=postgres
AUTH_DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
JWT_EXPIRATION=86400000
JWT_REFRESH_EXPIRATION=604800000

# Email (Gmail SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=noreply@edumind.com
MAIL_ENABLED=true

# Cloudinary (nếu dùng)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google OAuth2 (nếu dùng)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8081/login/oauth2/code/google

# Encryption
ENCRYPTION_KEY=your_encryption_key

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Ports (optional, có default values)
DISCOVERY_SERVER_PORT=8761
API_GATEWAY_PORT=8080
AUTH_SERVICE_PORT=8081
REDIS_PORT=6379
```

**⚠️ Lưu ý:** File `.env` chứa thông tin nhạy cảm, không commit vào Git!

### Bước 2: Start tất cả services

```bash
# Start tất cả services
docker compose up -d

# Xem logs
docker compose logs -f

# Xem logs của một service cụ thể
docker compose logs -f discovery-service
docker compose logs -f api-gateway
docker compose logs -f auth-service
```

### Bước 3: Kiểm tra services đang chạy

```bash
# List tất cả containers
docker compose ps

# Kiểm tra health status
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### Bước 4: Truy cập services

- **Discovery Service Dashboard**: http://localhost:8761
- **API Gateway**: http://localhost:8080
- **Auth Service**: http://localhost:8081
- **API Gateway Health**: http://localhost:8080/actuator/health
- **Auth Service Health**: http://localhost:8081/actuator/health

### Stop và Cleanup

```bash
# Stop tất cả services (giữ containers và volumes)
docker compose stop

# Stop và remove containers (giữ volumes)
docker compose down

# Stop và remove containers + volumes (xóa data)
docker compose down -v

# Stop và remove containers + volumes + images
docker compose down -v --rmi all
```

## 🔐 Environment Variables

### Discovery Service

| Variable | Default | Mô tả |
|----------|---------|-------|
| `DISCOVERY_SERVER_PORT` | 8761 | Port của Eureka Server |
| `EUREKA_HOSTNAME` | localhost | Hostname cho Eureka |

### API Gateway

| Variable | Default | Mô tả |
|----------|---------|-------|
| `API_GATEWAY_PORT` | 8080 | Port của API Gateway |
| `REDIS_HOST` | redis | Redis hostname (trong Docker network) |
| `REDIS_PORT` | 6379 | Redis port |
| `REDIS_PASSWORD` | - | Redis password (nếu có) |
| `EUREKA_DEFAULT_ZONE` | http://discovery-service:8761/eureka/ | Eureka server URL |

### Auth Service

| Variable | Default | Mô tả |
|----------|---------|-------|
| `AUTH_SERVICE_PORT` | 8081 | Port của Auth Service |
| `AUTH_DB_URL` | jdbc:postgresql://postgres-auth:5432/edumind_auth | Database URL |
| `AUTH_DB_USERNAME` | postgres | Database username |
| `AUTH_DB_PASSWORD` | - | Database password (required) |
| `JWT_SECRET` | - | JWT secret key (required, min 32 chars) |
| `JWT_EXPIRATION` | 86400000 | JWT expiration (ms) |
| `MAIL_USERNAME` | - | Email username (required) |
| `MAIL_PASSWORD` | - | Email password (required) |
| `CLOUDINARY_CLOUD_NAME` | - | Cloudinary cloud name |
| `GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `ENCRYPTION_KEY` | - | Encryption key (required) |

## 🐛 Troubleshooting

### 1. Build fails với "parent POM not found"

**Nguyên nhân:** Build context không đúng.

**Giải pháp:** Đảm bảo build từ thư mục `backend/`:
```bash
cd backend
docker build -f discovery-service/Dockerfile -t edumind/discovery-service:latest .
```

### 2. Service không kết nối được database

**Nguyên nhân:** Service start trước khi database ready.

**Giải pháp:** Docker Compose đã có `depends_on` với healthcheck. Kiểm tra:
```bash
docker compose ps
# Đảm bảo postgres-auth có status "healthy"
```

### 3. Service không register với Eureka

**Nguyên nhân:** 
- Discovery service chưa start
- Network configuration sai
- Hostname không resolve được

**Giải pháp:**
```bash
# Kiểm tra discovery-service đang chạy
docker compose logs discovery-service

# Kiểm tra network
docker network inspect backend_edumind-network

# Kiểm tra Eureka dashboard
curl http://localhost:8761/eureka/apps
```

### 4. Port đã được sử dụng

**Nguyên nhân:** Port đã bị chiếm bởi process khác.

**Giải pháp:**
```bash
# Tìm process đang dùng port
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Hoặc đổi port trong .env
API_GATEWAY_PORT=8082
```

### 5. Out of memory khi build

**Nguyên nhân:** Maven build cần nhiều memory.

**Giải pháp:** Tăng Docker memory limit hoặc build với ít memory:
```bash
docker build --memory=2g -f discovery-service/Dockerfile -t edumind/discovery-service:latest .
```

### 6. JAR file không tìm thấy

**Nguyên nhân:** Build path không đúng hoặc JAR không được tạo.

**Giải pháp:**
```bash
# Kiểm tra JAR có được tạo không
ls -la discovery-service/target/*.jar

# Build lại với verbose
docker build --progress=plain -f discovery-service/Dockerfile -t edumind/discovery-service:latest .
```

### 7. Health check fails

**Nguyên nhân:** Service chưa start xong hoặc health endpoint không available.

**Giải pháp:**
```bash
# Kiểm tra logs
docker compose logs auth-service

# Test health endpoint manually
docker exec edumind-auth-service wget -O- http://localhost:8081/actuator/health

# Tăng start_period trong docker-compose.yml
healthcheck:
  start_period: 120s  # Tăng từ 60s lên 120s
```

## 📝 Best Practices

1. **Luôn dùng multi-stage build** để giảm image size
2. **Sử dụng .dockerignore** để loại bỏ files không cần thiết
3. **Set health checks** cho tất cả services
4. **Dùng environment variables** thay vì hardcode values
5. **Tag images với version** thay vì chỉ dùng `latest`:
   ```bash
   docker build -t edumind/discovery-service:1.0.0 .
   ```
6. **Không commit .env file** vào Git
7. **Dùng docker compose** cho development, Kubernetes cho production

## 🔄 Development Workflow

### Workflow đề xuất:

1. **Development:**
   ```bash
   # Start infrastructure (DB, Redis)
   docker compose up -d postgres-auth redis
   
   # Run services locally với IDE
   # Services connect đến Docker containers
   ```

2. **Testing Docker images:**
   ```bash
   # Build images
   docker compose build
   
   # Start tất cả
   docker compose up -d
   
   # Test APIs
   curl http://localhost:8080/actuator/health
   ```

3. **Production:**
   ```bash
   # Build với production tags
   docker build -t edumind/discovery-service:v1.0.0 .
   
   # Push lên registry
   docker push edumind/discovery-service:v1.0.0
   ```

## 📚 Tài Liệu Tham Khảo

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Spring Boot Docker Guide](https://spring.io/guides/gs/spring-boot-docker/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

---

**Lưu ý:** Đây là tài liệu hướng dẫn cơ bản. Với production, cần thêm:
- Security scanning (Trivy, Snyk)
- Image signing
- Secret management (Vault, AWS Secrets Manager)
- Monitoring và logging (Prometheus, ELK)
- CI/CD pipeline

