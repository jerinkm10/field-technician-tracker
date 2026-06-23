FROM ghcr.io/cirruslabs/flutter:stable

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    clang \
    cmake \
    libgtk-3-dev \
    ninja-build \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

RUN flutter config --enable-linux-desktop

WORKDIR /usr/src/mobile
