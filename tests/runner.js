"use strict";

// Только собственные тестовые данные на отдельном origin 127.0.0.1:8766.
const storageKey = "web-project2.tasks";
const probeKey = "web-project2.tests.probe";
const shell = node("main", "app-shell panel");
const heading = node("h1", "panel__title", "Проверки списка задач");
const instruction = node("p", "", "Из корня проекта запустите python3 -m http.server 8766 --bind 127.0.0.1 и откройте http://127.0.0.1:8766/tests/. Проверки используют отдельное хранилище и не запускаются поверх существующих задач.");
const button = node("button", "button button--primary", "Запустить проверки");
button.type = "button";
const summary = node("p", "", "Проверки ещё не запущены.");
summary.id = "test-summary";
summary.setAttribute("role", "status");
const results = node("ol", "test-results");
const frame = node("iframe", "test-frame");
frame.title = "Тестируемое приложение";
shell.append(heading, instruction, button, summary, results, frame);
document.body.append(shell);

function node(tag, className = "", text = "") {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
    assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)}`);
}

function loadApp() {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Приложение не загрузилось за 8 секунд")), 8000);
        frame.onload = () => {
            clearTimeout(timeout);
            resolve(frame.contentWindow);
        };
        if (frame.getAttribute("src")) {
            frame.contentWindow.location.reload();
        } else {
            frame.src = "../index.html";
        }
    });
}

button.addEventListener("click", async () => {
    if (location.port !== "8766" || !["127.0.0.1", "localhost"].includes(location.hostname)) {
        summary.textContent = "Откройте проверки на отдельном локальном порту 8766 по инструкции выше.";
        return;
    }
    const initialTasks = localStorage.getItem(storageKey);
    if ((initialTasks !== null && initialTasks !== "[]") || localStorage.getItem(probeKey) !== null) {
        summary.textContent = "На этом origin уже есть данные. Проверки остановлены без изменений; используйте чистый профиль браузера на порту 8766.";
        return;
    }

    button.disabled = true;
    frame.hidden = false;
    results.replaceChildren();
    summary.textContent = "Выполняются проверки…";
    summary.dataset.status = "running";
    let passed = 0;
    let failed = 0;
    let appWindow;
    let createdIds;
    const $ = selector => appWindow.document.querySelector(selector);
    const rows = () => [...appWindow.document.querySelectorAll(".task-item")];
    const ids = () => rows().map(row => row.dataset.id);
    const saved = () => JSON.parse(localStorage.getItem(storageKey));
    const rowById = id => rows().find(row => row.dataset.id === id);
    const set = (selector, value, event = "input") => {
        $(selector).value = value;
        $(selector).dispatchEvent(new appWindow.Event(event, { bubbles: true }));
    };
    const add = (title, date) => {
        set("#task-title", title);
        set("#task-date", date);
        $("#task-form").requestSubmit();
    };
    async function test(name, run) {
        try {
            await run();
            passed += 1;
            results.append(node("li", "test-passed", `PASS — ${name}`));
        } catch (error) {
            failed += 1;
            results.append(node("li", "test-failed", `FAIL — ${name}: ${error.message}`));
        }
    }

    try {
        localStorage.setItem(probeKey, "не изменять");
        appWindow = await loadApp();

        await test("Пустое название, пробелы и отсутствие даты отклоняются", () => {
            add("", "2026-11-04");
            add("   ", "2026-11-04");
            add("Без даты", "");
            equal(rows().length, 0, "Не должно быть задач");
            equal(localStorage.getItem(storageKey), initialTasks, "Хранилище не должно измениться");
        });

        await test("Создание, уникальные идентификаторы и безопасный вывод текста", () => {
            add("  Одинаковая задача  ", "2026-11-04");
            add("Одинаковая задача", "2026-11-05");
            add("<b>Текст, а не разметка</b>", "2026-11-06");
            createdIds = ids();
            equal(rows().length, 3, "Число задач");
            equal(new Set(createdIds).size, 3, "Идентификаторы должны отличаться");
            equal(rows()[0].querySelector("h3").textContent, "Одинаковая задача", "Пробелы по краям убираются");
            equal(rows()[2].querySelector("h3").textContent, "<b>Текст, а не разметка</b>", "Название выводится буквально");
            assert(!rows()[2].querySelector("b"), "HTML не должен вставляться");
        });

        await test("Созданные задачи восстанавливаются после перезагрузки", async () => {
            appWindow = await loadApp();
            equal(ids(), createdIds, "Идентификаторы и порядок");
            equal(rows().map(row => row.querySelector("time").dateTime), ["2026-11-04", "2026-11-05", "2026-11-06"], "Даты после загрузки");
        });

        await test("Редактирование меняет только выбранную задачу и сохраняется", async () => {
            rowById(createdIds[1]).querySelector(".button--secondary:not(.task-move-button)").click();
            set("#task-title", "Изменённая задача");
            set("#task-date", "2026-11-07");
            $("#task-form").requestSubmit();
            appWindow = await loadApp();
            equal(rowById(createdIds[1]).querySelector("h3").textContent, "Изменённая задача", "Новое название");
            equal(rowById(createdIds[1]).querySelector("time").dateTime, "2026-11-07", "Новая дата");
            equal(rowById(createdIds[0]).querySelector("h3").textContent, "Одинаковая задача", "Другая задача не меняется");
        });

        await test("Отмена редактирования не меняет сохранённые данные", () => {
            const before = localStorage.getItem(storageKey);
            rowById(createdIds[0]).querySelector(".button--secondary:not(.task-move-button)").click();
            set("#task-title", "Черновик");
            set("#task-date", "2026-12-31");
            $(".form-actions .button--secondary").click();
            equal(localStorage.getItem(storageKey), before, "Хранилище после отмены");
            equal(rowById(createdIds[0]).querySelector("h3").textContent, "Одинаковая задача", "Название после отмены");
        });

        await test("Статус и визуальное оформление восстанавливаются", async () => {
            rowById(createdIds[1]).querySelector("input[type=checkbox]").click();
            appWindow = await loadApp();
            assert(rowById(createdIds[1]).querySelector("input").checked, "Отметка выполнения");
            assert(rowById(createdIds[1]).classList.contains("task-item--completed"), "Оформление выполнения");
        });

        await test("Поиск, статус и дата работают совместно; пустой результат и сброс", () => {
            set("#task-search", "  ИЗМЕНЁННАЯ  ");
            set("#status-filter", "completed", "change");
            set("#date-filter", "2026-11-07");
            set("#task-sort", "date-desc", "change");
            equal(ids(), [createdIds[1]], "Совместный результат");
            set("#status-filter", "active", "change");
            equal(rows().length, 0, "Пустой результат");
            assert(!$(".empty-state").hidden && $(".empty-state__title").textContent === "Ничего не найдено", "Сообщение пустого поиска");
            $(".reset-filters").click();
            equal(ids(), createdIds, "Сброс условий");
        });

        await test("Обе сортировки сохраняют исходный порядок и хранилище", () => {
            const before = localStorage.getItem(storageKey);
            set("#task-sort", "date-asc", "change");
            equal(ids(), [createdIds[0], createdIds[2], createdIds[1]], "По возрастанию дат");
            assert([...appWindow.document.querySelectorAll(".task-move-button")].every(button => button.disabled), "Перемещение при сортировке отключено");
            set("#task-sort", "date-desc", "change");
            equal(ids(), [createdIds[1], createdIds[2], createdIds[0]], "По убыванию дат");
            set("#task-sort", "manual", "change");
            equal(ids(), createdIds, "Ручной порядок восстановлен");
            equal(localStorage.getItem(storageKey), before, "Сортировка не переписывает данные");
        });

        await test("Перемещение вверх/вниз кнопками сохраняет порядок после загрузки", async () => {
            rowById(createdIds[2]).querySelector('[aria-label="Переместить выше"]').click();
            equal(ids(), [createdIds[0], createdIds[2], createdIds[1]], "Перемещение вверх");
            rowById(createdIds[0]).querySelector('[aria-label="Переместить ниже"]').click();
            const expected = [createdIds[2], createdIds[0], createdIds[1]];
            equal(ids(), expected, "Перемещение вниз");
            appWindow = await loadApp();
            equal(ids(), expected, "Порядок после перезагрузки");
        });

        await test("Удаление выбранной и последней задачи сохраняется", async () => {
            rowById(createdIds[1]).querySelector(".button--danger").click();
            appWindow = await loadApp();
            assert(!rowById(createdIds[1]) && rows().length === 2, "Удалена только выбранная задача");
            for (const id of ids()) rowById(id).querySelector(".button--danger").click();
            appWindow = await loadApp();
            equal(saved(), [], "Пустой сохранённый список");
            assert($("#task-list").hidden && !$(".empty-state").hidden, "Пустое состояние после удаления");
        });

        await test("Повреждённые данные не приводят к падению и не перезаписываются", async () => {
            const task = { id: "fixture-1", title: "Тест", date: "2026-11-04", completed: false };
            const invalid = ["{broken", "null", "{}", JSON.stringify([{ ...task, date: "2026-02-29" }]), JSON.stringify([{ ...task, completed: "false" }]), JSON.stringify([task, task])];
            for (const raw of invalid) {
                localStorage.setItem(storageKey, raw);
                appWindow = await loadApp();
                assert(!$(".storage-message").hidden, "Предупреждение о хранилище");
                equal(rows().length, 0, "Некорректные задачи не отображаются");
                add("Новая тестовая задача", "2026-11-04");
                equal(localStorage.getItem(storageKey), raw, "Исходное значение должно сохраниться");
            }
        });

        await test("Посторонний ключ localStorage не изменён", () => {
            equal(localStorage.getItem(probeKey), "не изменять", "Посторонний ключ");
        });
    } catch (error) {
        failed += 1;
        results.append(node("li", "test-failed", `Ошибка запуска: ${error.message}`));
    } finally {
        // При входе задач не было: восстанавливается исходное пустое состояние.
        if (initialTasks === null) localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, initialTasks);
        localStorage.removeItem(probeKey);
        frame.hidden = true;
        summary.textContent = `Пройдено: ${passed}. Ошибок: ${failed}. Тестовые данные очищены.`;
        summary.dataset.status = failed ? "failed" : "passed";
        summary.dataset.passed = passed;
        summary.dataset.failed = failed;
        button.disabled = false;
    }
});
