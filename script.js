"use strict";

function createElement(tagName, className = "", text = "") {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
}

function createField(labelText, control) {
    const field = createElement("div", "field");
    const label = createElement("label", "field__label", labelText);
    label.htmlFor = control.id;
    field.append(label, control);
    return field;
}

function createSelect(id, name, options) {
    const select = createElement("select", "field__control");
    select.id = id;
    select.name = name;
    select.disabled = true;

    for (const [value, text] of options) {
        const option = createElement("option", "", text);
        option.value = value;
        select.append(option);
    }

    return select;
}

function createApp() {
    const root = createElement("div", "app-shell");
    const header = createElement("header", "app-header");
    const title = createElement("h1", "app-header__title", "Список задач");
    const subtitle = createElement("p", "app-header__subtitle", "Освободите голову для важных дел.");
    header.append(title, subtitle);

    const main = createElement("main", "app-main");
    const formSection = createElement("section", "panel task-editor");
    const formHeading = createElement("h2", "panel__title", "Новая задача");
    formHeading.id = "form-heading";
    formSection.setAttribute("aria-labelledby", formHeading.id);

    const form = createElement("form", "task-form");
    form.id = "task-form";
    form.setAttribute("aria-labelledby", formHeading.id);

    const titleInput = createElement("input", "field__control");
    titleInput.id = "task-title";
    titleInput.name = "title";
    titleInput.type = "text";
    titleInput.required = true;
    titleInput.maxLength = 120;
    titleInput.placeholder = "Что нужно сделать?";

    const dateInput = createElement("input", "field__control");
    dateInput.id = "task-date";
    dateInput.name = "date";
    dateInput.type = "date";
    dateInput.required = true;

    const addButton = createElement("button", "button button--primary", "Добавить задачу");
    addButton.type = "submit";
    form.append(createField("Название задачи", titleInput), createField("Дата задачи", dateInput), addButton);
    formSection.append(formHeading, form);

    const filterSection = createElement("section", "panel task-filters");
    const filterHeading = createElement("h2", "panel__title", "Найти задачи");
    filterHeading.id = "filters-heading";
    filterSection.setAttribute("aria-labelledby", filterHeading.id);

    const filterControls = createElement("div", "filter-controls");
    const searchInput = createElement("input", "field__control");
    searchInput.id = "task-search";
    searchInput.name = "query";
    searchInput.type = "search";
    searchInput.placeholder = "Поиск по названию";
    searchInput.disabled = true;

    const statusSelect = createSelect("status-filter", "status", [
        ["all", "Все задачи"],
        ["active", "Невыполненные"],
        ["completed", "Выполненные"]
    ]);

    const dateFilter = createElement("input", "field__control");
    dateFilter.id = "date-filter";
    dateFilter.name = "filterDate";
    dateFilter.type = "date";
    dateFilter.disabled = true;

    const sortSelect = createSelect("task-sort", "sort", [
        ["manual", "Свой порядок"],
        ["date-asc", "Сначала ближайшие даты"],
        ["date-desc", "Сначала дальние даты"]
    ]);

    filterControls.append(
        createField("Поиск", searchInput),
        createField("Статус", statusSelect),
        createField("Дата", dateFilter),
        createField("Сортировка", sortSelect)
    );
    filterSection.append(filterHeading, filterControls);

    const tasksSection = createElement("section", "panel tasks-section");
    const tasksHeader = createElement("div", "tasks-section__header");
    const tasksHeading = createElement("h2", "panel__title", "Мои задачи");
    tasksHeading.id = "tasks-heading";
    tasksSection.setAttribute("aria-labelledby", tasksHeading.id);

    const taskCount = createElement("p", "task-count", "Всего задач: 0");
    taskCount.setAttribute("role", "status");
    tasksHeader.append(tasksHeading, taskCount);

    const taskList = createElement("ul", "task-list");
    taskList.id = "task-list";
    taskList.setAttribute("aria-labelledby", tasksHeading.id);
    taskList.hidden = true;

    const emptyState = createElement("div", "empty-state");
    emptyState.append(
        createElement("h3", "empty-state__title", "Пока нет задач"),
        createElement("p", "empty-state__text", "Добавьте задачу, чтобы начать планирование.")
    );

    tasksSection.append(tasksHeader, taskList, emptyState);
    main.append(formSection, filterSection, tasksSection);
    root.append(header, main);

    return {
        root, form, titleInput, dateInput, addButton,
        searchInput, statusSelect, dateFilter, sortSelect,
        taskList, taskCount, emptyState
    };
}

const app = createApp();
document.body.append(app.root);

const tasks = [];

function createTaskItem(task) {
    const item = createElement("li", "task-item");
    item.dataset.id = task.id;

    const title = createElement("h3", "task-item__title", task.title);
    const date = createElement("time", "task-item__date", `Дата: ${task.date.split("-").reverse().join(".")}`);
    date.dateTime = task.date;

    item.append(title, date);
    return item;
}

function renderTasks() {
    const fragment = document.createDocumentFragment();

    for (const task of tasks) {
        fragment.append(createTaskItem(task));
    }

    app.taskList.replaceChildren(fragment);
    app.taskList.hidden = tasks.length === 0;
    app.emptyState.hidden = tasks.length > 0;
    app.taskCount.textContent = `Всего задач: ${tasks.length}`;
}

app.titleInput.addEventListener("input", () => {
    app.titleInput.setCustomValidity("");
});

app.form.addEventListener("submit", event => {
    event.preventDefault();

    const title = app.titleInput.value.trim();
    app.titleInput.setCustomValidity(title ? "" : "Введите название задачи, а не только пробелы.");

    if (!app.form.reportValidity()) {
        return;
    }

    tasks.push({
        id: crypto.randomUUID(),
        title,
        date: app.dateInput.value,
        completed: false
    });

    renderTasks();
    app.form.reset();
    app.titleInput.focus();
});
