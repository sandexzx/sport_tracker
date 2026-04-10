# Sport Tracker

Трекер тренировок — PWA-приложение для учёта упражнений, замеров тела и прогресса.

## Запуск через Docker

### Требования

- Docker и Docker Compose

### Как запустить

```bash
docker compose up -d --build
```

Приложение будет доступно по адресу: `http://<ip-адрес>:3000`

### Как обновить

```bash
docker compose down
docker compose up -d --build
```

### Хранение данных

Данные хранятся на хосте и не удаляются при пересборке контейнера:

- `./data/` — база данных SQLite (`sport_tracker.db`)
- `./uploads/` — загруженные фотографии

### Резервная копия

Скопировать файл базы данных:

```bash
cp ./data/sport_tracker.db ./data/sport_tracker_backup.db
```

Или использовать встроенный экспорт/импорт в настройках приложения.

### Остановка

```bash
docker compose down
```
