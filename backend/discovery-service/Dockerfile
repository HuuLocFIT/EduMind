# Multi-stage build để tối ưu kích thước image
# Stage 1: Build application
FROM maven:3.9-eclipse-temurin-21 AS build

# Set working directory
WORKDIR /app

# Copy toàn bộ project (build context phải là thư mục backend/)
COPY pom.xml /app/pom.xml
COPY discovery-service/pom.xml /app/discovery-service/pom.xml
COPY discovery-service/src /app/discovery-service/src

# Build application (skip tests để build nhanh hơn)
# Build từ root để resolve parent POM
RUN mvn clean package -DskipTests -pl discovery-service -am

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine

# Cài wget cho health check (phải cài trước khi switch user)
RUN apk add --no-cache wget && \
    addgroup -S spring && \
    adduser -S spring -G spring

# Switch sang non-root user để tăng bảo mật
USER spring:spring

# Set working directory
WORKDIR /app

# Copy JAR file từ build stage
COPY --from=build /app/discovery-service/target/service-discovery-*.jar app.jar

# Expose port
EXPOSE 8761

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8761/actuator/health || exit 1

# Run application
ENTRYPOINT ["java", "-jar", "app.jar"]

