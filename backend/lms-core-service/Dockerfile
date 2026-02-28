# Multi-stage build to optimize image size
# Stage 1: Build application
FROM maven:3.9-eclipse-temurin-21 AS build

# Set working directory
WORKDIR /app

# Copy parent POM
COPY pom.xml /app/pom.xml

# Copy ALL module POMs to prevent Reactor errors
COPY api-gateway/pom.xml /app/api-gateway/pom.xml
COPY auth-service/pom.xml /app/auth-service/pom.xml
COPY common-lib/pom.xml /app/common-lib/pom.xml
COPY discovery-service/pom.xml /app/discovery-service/pom.xml
COPY lms-core-service/pom.xml /app/lms-core-service/pom.xml

# Resolve dependencies Offline
# This layer will be cached unless one of the POMs above changes
# We use -pl lms-core-service to only resolve dependencies for this module
RUN mvn dependency:go-offline -B -pl lms-core-service -am

# Copy source code ONLY for the modules we are building (and its dependencies)
COPY common-lib/src /app/common-lib/src
COPY lms-core-service/src /app/lms-core-service/src

# Build application (skip tests to build faster)
RUN mvn clean package -DskipTests -pl lms-core-service -am

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine

# Install runtime deps:
# - wget: healthcheck
# - python3 + ffmpeg + yt-dlp: YouTube caption/audio fallback
RUN apk add --no-cache wget python3 ffmpeg yt-dlp && \
    addgroup -S spring && \
    adduser -S spring -G spring

# Switch to non-root user
USER spring:spring

WORKDIR /app

# Copy JAR file from build stage
COPY --from=build /app/lms-core-service/target/lms-core-service-*.jar app.jar

EXPOSE 8083

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8083/actuator/health || exit 1

# Run application with graceful shutdown support (exec)
ENTRYPOINT ["sh", "-c", "exec java ${JAVA_OPTS} -jar app.jar"]
