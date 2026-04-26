# Use Java 21
FROM eclipse-temurin:21-jdk

WORKDIR /app

# Copy everything
COPY . .

# Build the app
RUN ./mvnw clean package -DskipTests || mvn clean package -DskipTests

# Run the app
CMD ["java", "-jar", "target/lostandfound-0.0.1-SNAPSHOT.jar"]