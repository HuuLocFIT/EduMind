# Multi-stage build to optimize image size
# Stage 1: Build application
FROM maven:3.9-eclipse-temurin-21 AS build

# Set working directory
WORKDIR /app

# Copy parent POM + all module POM to ensure Maven doesn't complain about missing modules
COPY pom.xml /app/pom.xml
COPY api-gateway/pom.xml /app/api-gateway/pom.xml
COPY auth-service/pom.xml /app/auth-service/pom.xml
COPY common-lib/pom.xml /app/common-lib/pom.xml

# Copy source for module to build/dependencies
COPY common-lib/src /app/common-lib/src
COPY discovery-service/pom.xml /app/discovery-service/pom.xml
COPY discovery-service/src /app/discovery-service/src

# Build application (skip tests to build faster)
# Build from root to resolve parent POM
RUN mvn clean package -DskipTests -pl discovery-service -am

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine

# Install wget for health check (must install before switching user)
RUN apk add --no-cache wget && \
    addgroup -S spring && \
    adduser -S spring -G spring

# Switch to non-root user to increase security
USER spring:spring

# Set working directory
WORKDIR /app

# Copy JAR file from build stage
COPY --from=build /app/discovery-service/target/service-discovery-*.jar app.jar

# Expose port
EXPOSE 8761

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8761/actuator/health || exit 1

# Run application
ENTRYPOINT ["java", "-jar", "app.jar"]

