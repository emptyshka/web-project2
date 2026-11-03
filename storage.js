"use strict";

const TASKS_STORAGE_KEY = "web-project2.tasks";

function isValidTaskDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "0001-01-01") {
        return false;
    }
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateStoredTasks(value) {
    if (!Array.isArray(value)) {
        return false;
    }
    const ids = new Set();
    return value.every(task => {
        if (!task || typeof task !== "object" ||
            typeof task.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(task.id) || ids.has(task.id) ||
            typeof task.title !== "string" || !task.title.trim() || task.title.length > 120 ||
            !isValidTaskDate(task.date) || typeof task.completed !== "boolean") {
            return false;
        }
        ids.add(task.id);
        return true;
    });
}

function loadTasks() {
    try {
        const saved = localStorage.getItem(TASKS_STORAGE_KEY);
        if (saved === null) {
            return { tasks: [], canSave: true, error: "" };
        }
        const parsed = JSON.parse(saved);
        if (!validateStoredTasks(parsed)) {
            throw new Error("Некорректная структура задач");
        }
        return { tasks: parsed, canSave: true, error: "" };
    } catch {
        return {
            tasks: [],
            canSave: false,
            error: "Не удалось прочитать сохранённые задачи. Исходные данные не изменены. Новые изменения в этой вкладке не сохраняются; проверьте доступ к хранилищу и сохранённые данные перед перезагрузкой."
        };
    }
}

function saveTasks(tasks) {
    try {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch {
        return false;
    }
}
