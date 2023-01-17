#!/usr/bin/env bash

set -e

# Set your manifest name
export MANIFEST_NAME="local-circom"

# Set the required variables
export REGISTRY="ghcr.io"
export USER="fullkomnun"
export IMAGE_NAME="local-circom"
export IMAGE_TAG="latest"

# Create a multi-architecture manifest
podman manifest create ${MANIFEST_NAME}

# Build your amd64 architecture container
podman build \
    --no-cache \
    --tag "${REGISTRY}/${USER}/${IMAGE_NAME}:${IMAGE_TAG}" \
    --manifest ${MANIFEST_NAME} \
    --arch amd64 \
    - < docker/circom.Dockerfile

# Build your arm64 architecture container
podman build \
    --no-cache \
    --tag "${REGISTRY}/${USER}/${IMAGE_NAME}:${IMAGE_TAG}" \
    --manifest ${MANIFEST_NAME} \
    --arch arm64 \
    - < docker/circom.Dockerfile

# Push the full manifest, with both CPU Architectures
podman manifest push --all \
    ${MANIFEST_NAME} \
    "docker://${REGISTRY}/${USER}/${IMAGE_NAME}:${IMAGE_TAG}"