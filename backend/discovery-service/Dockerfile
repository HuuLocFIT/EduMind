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
RUN mvn dependency:go-offline -B -pl discovery-service -am

# Copy source code ONLY for the modules we are building (and its dependencies)
COPY common-lib/src /app/common-lib/src
COPY discovery-service/src /app/discovery-service/src

# Build application (skip tests to build faster)
RUN mvn clean package -DskipTests -pl discovery-service -am

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine

# Install wget for health check and create user
RUN apk add --no-cache wget && \
    addgroup -S spring && \
    adduser -S spring -G spring

# Switch to non-root user
USER spring:spring

WORKDIR /app

# Copy JAR file from build stage
COPY --from=build /app/discovery-service/target/service-discovery-*.jar app.jar

# Expose port
EXPOSE 8761

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8761/actuator/health || exit 1

# Run application with graceful shutdown support (exec)
ENTRYPOINT ["sh", "-c", "exec java ${JAVA_OPTS} -jar app.jar"]

