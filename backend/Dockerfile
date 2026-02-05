# build stage
FROM eclipse-temurin:21-jdk AS build
WORKDIR /backend
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src src
RUN ./gradlew bootJar -x test

# run stage
FROM eclipse-temurin:21-jre
WORKDIR /backend
COPY --from=build /backend/build/libs/*.jar backend.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "backend.jar"]
