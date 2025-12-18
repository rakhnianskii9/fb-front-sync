#!/bin/bash

# Пути
SOURCE="/home/projects/fb-front-sync/"
TARGET="/home/projects/new-flowise/packages/fb-front/"

# Исключения (node_modules, dist, .git и т.д.)
EXCLUDES="--exclude=node_modules --exclude=dist --exclude=.git --exclude=.turbo --exclude=.local --exclude=.config --exclude=sync.sh --exclude=sync-instruction.md"

case "$1" in
  push)
    # Отправить изменения из fb-front-sync в fb-front
    rsync -avz --delete $EXCLUDES "$SOURCE" "$TARGET"
    echo "✅ Синхронизировано: fb-front-sync → fb-front"
    ;;
  pull)
    # Забрать изменения из fb-front в fb-front-sync
    rsync -avz $EXCLUDES "$TARGET" "$SOURCE"
    echo "✅ Синхронизировано: fb-front → fb-front-sync"
    ;;
  watch)
    # Автоматическая синхронизация при изменениях
    echo "👀 Слежу за изменениями в $SOURCE..."
    while inotifywait -r -e modify,create,delete,move "$SOURCE" --exclude '(node_modules|\.git|dist|\.turbo)'; do
      rsync -avz --delete $EXCLUDES "$SOURCE" "$TARGET"
      echo "✅ Синхронизировано: $(date)"
    done
    ;;
  from-replit)
    # Полный цикл: GitHub → основной проект
    echo "📥 Забираю из GitHub..."
    git pull
    rsync -avz --delete $EXCLUDES "$SOURCE" "$TARGET"
    echo "✅ Replit → основной проект"
    ;;
  to-replit)
    # Полный цикл: основной проект → GitHub
    echo "📤 Отправляю в GitHub..."
    rsync -avz $EXCLUDES "$TARGET" "$SOURCE"
    git add .
    git commit -m "sync: $(date '+%Y-%m-%d %H:%M')" || true
    git push
    echo "✅ Основной проект → Replit"
    ;;
  *)
    echo "Использование: ./sync.sh [команда]"
    echo ""
    echo "Базовые:"
    echo "  push       - fb-front-sync → основной проект"
    echo "  pull       - основной проект → fb-front-sync"
    echo "  watch      - автосинхронизация при изменениях"
    echo ""
    echo "Полный цикл с Git:"
    echo "  from-replit - git pull + push в основной проект"
    echo "  to-replit   - pull из основного + git push"
    ;;
esac
