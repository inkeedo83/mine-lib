#!/bin/bash

echo "===== Имитация GitLab CI пайплайна ====="
echo ""

# Установка переменных окружения
export NEXUS_USERNAME=${NEXUS_USERNAME:-pusher}
export NEXUS_PASSWORD=${NEXUS_PASSWORD:-pusher}

echo "Этап: build"
echo "----------------"
docker run --rm -v $(pwd):/app -w /app node:22-alpine sh -c "npm ci --include=dev && npx tsc"

if [ $? -ne 0 ]; then
  echo "❌ Этап build завершился с ошибкой"
  exit 1
fi

echo "✅ Этап build успешно завершен"
echo ""

# Создаем временную директорию для публикации
echo "Подготовка к публикации"
echo "---------------------"
mkdir -p temp_publish
cp package.json temp_publish/
cp package-lock.json temp_publish/
cp -r dist/* temp_publish/
[ -f README.md ] && cp README.md temp_publish/
[ -f LICENSE ] && cp LICENSE temp_publish/

echo "Этап: publish"
echo "----------------"
# Используем host.docker.internal для доступа к localhost хост-машины
docker run --rm -v $(pwd)/temp_publish:/app -w /app \
  -e NEXUS_USERNAME=$NEXUS_USERNAME \
  -e NEXUS_PASSWORD=$NEXUS_PASSWORD \
  --add-host=host.docker.internal:host-gateway \
  node:22-alpine sh -c "echo '//localhost:8081/repository/npm-local/:_auth='$(echo -n $NEXUS_USERNAME:$NEXUS_PASSWORD | base64) > .npmrc && \
  echo 'registry=http://localhost:8081/repository/npm-local/' >> .npmrc && \
  echo 'always-auth=true' >> .npmrc && \
  cat .npmrc && \
  npm publish --ignore-scripts"

if [ $? -ne 0 ]; then
  echo "❌ Этап publish завершился с ошибкой"
  exit 1
fi

echo "✅ Этап publish успешно завершен"
echo ""
echo "🎉 CI/CD пайплайн успешно выполнен"

# Очистка
rm -rf temp_publish 