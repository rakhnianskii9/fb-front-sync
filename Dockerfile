FROM node:20-alpine

WORKDIR /app

# Копируем конфигурационные файлы и исходники
COPY package.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.cjs ./
COPY client ./client
COPY shared ./shared
COPY attached_assets ./attached_assets

# Устанавливаем pnpm и зависимости без frozen lock
RUN npm install -g pnpm && \
    pnpm install --no-frozen-lockfile

# Собираем клиент (создаст dist/public согласно vite.config.ts)
RUN pnpm build

# Устанавливаем serve
RUN npm install -g serve

EXPOSE 3000

# Меняем рабочую директорию на директорию с собранными файлами
WORKDIR /app/dist/public

# Запускаем serve для SPA с флагом --single (fallback на index.html для всех роутов)
# serve теперь работает из /app/dist/public, что позволяет корректно определять MIME-типы
CMD ["serve", "-s", ".", "-l", "3000", "--single"]
