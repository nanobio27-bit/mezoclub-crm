---
name: create-module
description: Создать новый бэкенд-модуль с routes, service, repository, types. Используй когда нужно добавить новый домен.
---

# Создание модуля: $ARGUMENTS

Создай полный модуль в `src/modules/$ARGUMENTS/` со следующими файлами:

## 1. types.ts
- Импортируй базовые типы из `../../shared/types/common`
- Если для этого модуля уже есть типы в common.ts — используй их
- Если нет — создай интерфейсы: основная сущность, CreateDto, UpdateDto
- Используй `as const` объекты для enum-значений

## 2. repository.ts
- Наследуй от `BaseRepository` из `../../shared/database/base-repository`
- SQL-запросы через pg pool (`this.pool.query(...)`)
- Метод `findAll` с поддержкой: пагинация, поиск, сортировка, фильтры
- Метод `findById` с JOIN если нужны связанные данные
- Все запросы включают `WHERE deleted_at IS NULL`
- Параметризированные запросы ($1, $2...) — НИКОГДА строковая конкатенация

## 3. service.ts
- Бизнес-логика модуля
- Валидация бизнес-правил (не дублирует валидацию route)
- Вызывает repository, не SQL напрямую
- Методы: list, getById, create, update, softDelete
- Для заказов: логика расчёта сумм, смены статусов

## 4. routes.ts
- Express Router
- Маршруты: GET /, GET /:id, POST /, PUT /:id, DELETE /:id
- Middleware: authMiddleware на всех, roleMiddleware где нужно
- Валидация входных данных
- Swagger JSDoc комментарии для каждого роута
- Обработка ошибок через try/catch → next(error)

## 5. index.ts
- Реэкспорт: router, service, repository, типы

## Правила
- Комментарии на русском языке
- Следуй правилам из CLAUDE.md
- После создания запусти `npx tsc --noEmit` чтобы проверить типы
