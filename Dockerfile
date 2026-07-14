# Build stage
FROM gcc:12-bookworm as builder
WORKDIR /app

# Copy headers and source code
COPY include/ ./include/
COPY src/ ./src/
COPY libs/ ./libs/

# Compile the C++ backend
# We use -pthread because httplib requires it
RUN g++ -std=c++17 src/*.cpp -I include -I libs -o vcs_server -pthread

# Production stage
FROM debian:bookworm-slim
WORKDIR /app

# Install git and bash (useful for debugging, though mini-git implements its own engine)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder stage
COPY --from=builder /app/vcs_server .

# Expose the dynamic port provided by Render
EXPOSE $PORT

# Start the server using the port assigned by Render, defaulting to 8080
CMD ./vcs_server serve ${PORT:-8080}
