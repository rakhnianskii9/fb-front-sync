#!/bin/bash

# Пути
SOURCE="/home/projects/fb-front-sync/"
TARGET="/home/projects/new-flowise/packages/fb-front/"

# Исключения (node_modules, dist, .git и т.д.)
EXCLUDES="--exclude=node_modules --exclude=dist --exclude=.git --exclude=.turbo --exclude=.local --exclude=.config --exclude=sync.sh"

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
  *)
    echo "Использование: ./sync.sh [push|pull|watch]"
    echo "  push  - отправить из fb-front-sync в основной проект"
    echo "  pull  - забрать из основного проекта в fb-front-sync"
    echo "  watch - автоматическая синхронизация при изменениях"
    ;;
esac
