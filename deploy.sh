#!/bin/sh
# deploy.sh — รัน: ./deploy.sh
# ใช้ .env.production เป็น env file ทั้ง build args และ runtime
set -e

docker compose --env-file .env.production up -d --build app
