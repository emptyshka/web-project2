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
    dateInput.min = "0001-01-01";
    dateInput.max = "9999-12-31";

    const addButton = createElement("button", "button button--primary", "Добавить задачу");
    addButton.type = "submit";
    const cancelButton = createElement("button", "button button--secondary", "Отмена");
    cancelButton.type = "button";
    cancelButton.hidden = true;
    const formActions = createElement("div", "form-actions");
    formActions.append(addButton, cancelButton);
    form.append(createField("Название задачи", titleInput), createField("Дата задачи", dateInput), formActions);
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

    const statusSelect = createSelect("status-filter", "status", [
        ["all", "Все задачи"],
        ["active", "Невыполненные"],
        ["completed", "Выполненные"]
    ]);

    const dateFilter = createElement("input", "field__control");
    dateFilter.id = "date-filter";
    dateFilter.name = "filterDate";
    dateFilter.type = "date";
    dateFilter.min = "0001-01-01";
    dateFilter.max = "9999-12-31";

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
    const resetFiltersButton = createElement("button", "button button--secondary reset-filters", "Сбросить фильтры");
    resetFiltersButton.type = "button";
    filterSection.append(filterHeading, filterControls, resetFiltersButton);

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
    const emptyTitle = createElement("h3", "empty-state__title", "Пока нет задач");
    const emptyText = createElement("p", "empty-state__text", "Добавьте задачу, чтобы начать планирование.");
    emptyState.append(emptyTitle, emptyText);

    const orderHint = createElement("p", "order-hint");
    orderHint.id = "order-hint";
    const orderStatus = createElement("p", "visually-hidden");
    orderStatus.setAttribute("role", "status");
    tasksSection.append(tasksHeader, orderHint, orderStatus, taskList, emptyState);
    const storageMessage = createElement("p", "storage-message");
    storageMessage.setAttribute("role", "alert");
    storageMessage.hidden = true;
    main.append(storageMessage, formSection, filterSection, tasksSection);
    root.append(header, main);

    return {
        root, form, formHeading, titleInput, dateInput, addButton, cancelButton,
        searchInput, statusSelect, dateFilter, sortSelect, resetFiltersButton,
        taskList, taskCount, emptyState, emptyTitle, emptyText, storageMessage, orderHint, orderStatus
    };
}

const app = createApp();
document.body.append(app.root);

const loadedState = loadTasks();
const tasks = loadedState.tasks;
let editingTaskId = null;
let draggedTaskId = null;

function canReorderTasks() {
    return app.sortSelect.value === "manual" && !app.searchInput.value.trim() &&
        app.statusSelect.value === "all" && !app.dateFilter.value;
}

function moveTask(sourceId, targetId, position) {
    if (!canReorderTasks()) {
        return;
    }
    const reordered = getReorderedTasks(tasks, sourceId, targetId, position);
    if (reordered.every((task, index) => task.id === tasks[index].id)) {
        return;
    }
    tasks.splice(0, tasks.length, ...reordered);
    persistTasks();
    renderTasks();
    const movedIndex = tasks.findIndex(task => task.id === sourceId);
    app.orderStatus.textContent = `${tasks[movedIndex].title}: позиция ${movedIndex + 1} из ${tasks.length}.`;
    const focusTarget = app.taskList.querySelector(`[data-id="${sourceId}"] .task-move-button:not(:disabled)`);
    focusTarget?.focus();
}

function clearDropMarkers() {
    for (const item of app.taskList.children) {
        item.classList.remove("task-item--drop-before", "task-item--drop-after");
    }
}

function finishDragging() {
    draggedTaskId = null;
    clearDropMarkers();
    app.taskList.querySelector(".task-item--dragging")?.classList.remove("task-item--dragging");
}

function getDropPosition(event, item) {
    const rect = item.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

function addReorderControls(item, task) {
    const index = tasks.findIndex(candidate => candidate.id === task.id);
    const enabled = canReorderTasks();
    const handle = createElement("span", "drag-handle", "⠿");
    handle.classList.toggle("drag-handle--disabled", !enabled || tasks.length < 2);
    handle.title = "Перетащить задачу";
    handle.setAttribute("aria-hidden", "true");
    let pointerStart = null;

    function findDropTarget(event) {
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".task-item");
        return target && app.taskList.contains(target) && target !== item ? target : null;
    }

    handle.addEventListener("pointerdown", event => {
        if (!canReorderTasks() || tasks.length < 2 || event.button !== 0) {
            return;
        }
        pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
        handle.setPointerCapture(event.pointerId);
        event.preventDefault();
    });
    handle.addEventListener("pointermove", event => {
        if (!pointerStart || pointerStart.id !== event.pointerId || !canReorderTasks()) {
            return;
        }
        if (!draggedTaskId && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) < 6) {
            return;
        }
        draggedTaskId = task.id;
        item.classList.add("task-item--dragging");
        clearDropMarkers();
        const target = findDropTarget(event);
        if (target) {
            target.classList.add(`task-item--drop-${getDropPosition(event, target)}`);
        }
    });
    handle.addEventListener("pointerup", event => {
        if (!pointerStart || pointerStart.id !== event.pointerId) {
            return;
        }
        const target = draggedTaskId === task.id ? findDropTarget(event) : null;
        pointerStart = null;
        handle.releasePointerCapture(event.pointerId);
        finishDragging();
        if (target) {
            moveTask(task.id, target.dataset.id, getDropPosition(event, target));
        }
    });
    handle.addEventListener("pointercancel", () => {
        pointerStart = null;
        finishDragging();
    });

    const orderControls = createElement("div", "task-item__order");
    orderControls.setAttribute("role", "group");
    orderControls.setAttribute("aria-label", "Порядок задачи");
    orderControls.setAttribute("aria-describedby", app.orderHint.id);
    const upButton = createTaskButton("↑", "button--secondary task-move-button", () => {
        if (index > 0) moveTask(task.id, tasks[index - 1].id, "before");
    });
    upButton.setAttribute("aria-label", "Переместить выше");
    upButton.title = "Переместить выше";
    upButton.disabled = !enabled || index === 0;
    const downButton = createTaskButton("↓", "button--secondary task-move-button", () => {
        if (index < tasks.length - 1) moveTask(task.id, tasks[index + 1].id, "after");
    });
    downButton.setAttribute("aria-label", "Переместить ниже");
    downButton.title = "Переместить ниже";
    downButton.disabled = !enabled || index === tasks.length - 1;
    orderControls.append(handle, upButton, downButton);
    return orderControls;
}

function showStorageError(message) {
    app.storageMessage.textContent = message;
    app.storageMessage.hidden = !message;
}

showStorageError(loadedState.error);

function persistTasks() {
    if (!loadedState.canSave) {
        return;
    }
    const saved = saveTasks(tasks);
    showStorageError(saved ? "" : "Не удалось сохранить изменения. Задачи доступны в этой вкладке, но после перезагрузки изменения могут потеряться. Проверьте доступ к хранилищу и свободное место.");
}

function resetTaskForm() {
    editingTaskId = null;
    app.form.reset();
    app.titleInput.setCustomValidity("");
    app.formHeading.textContent = "Новая задача";
    app.addButton.textContent = "Добавить задачу";
    app.cancelButton.hidden = true;
}

function startEditing(task) {
    editingTaskId = task.id;
    app.titleInput.setCustomValidity("");
    app.titleInput.value = task.title;
    app.dateInput.value = task.date;
    app.formHeading.textContent = "Редактирование задачи";
    app.addButton.textContent = "Сохранить изменения";
    app.cancelButton.hidden = false;
    app.titleInput.focus();
}

function deleteTask(id) {
    const index = tasks.findIndex(task => task.id === id);
    if (index === -1) {
        return;
    }

    tasks.splice(index, 1);
    if (editingTaskId === id) {
        resetTaskForm();
    }
    persistTasks();
    renderTasks();
    app.titleInput.focus();
}

function createTaskButton(text, className, onClick) {
    const button = createElement("button", `button ${className}`, text);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
}

function createTaskItem(task) {
    const item = createElement("li", "task-item");
    item.dataset.id = task.id;
    item.classList.toggle("task-item--completed", task.completed);

    const title = createElement("h3", "task-item__title", task.title);
    const date = createElement("time", "task-item__date", `Дата: ${task.date.split("-").reverse().join(".")}`);
    date.dateTime = task.date;

    const content = createElement("div", "task-item__content");
    content.append(title, date);

    const status = createElement("label", "task-status");
    const checkbox = createElement("input", "task-item__checkbox");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => {
        task.completed = checkbox.checked;
        persistTasks();
        renderTasks();
        const checkboxToFocus = app.taskList.querySelector(`[data-id="${task.id}"] .task-item__checkbox`);
        (checkboxToFocus || app.statusSelect).focus();
    });
    status.append(checkbox, createElement("span", "", "Выполнено"));

    const actions = createElement("div", "task-item__actions");
    actions.append(
        status,
        createTaskButton("Редактировать", "button--secondary", () => startEditing(task)),
        createTaskButton("Удалить", "button--danger", () => deleteTask(task.id))
    );
    item.append(addReorderControls(item, task), content, actions);
    return item;
}

function renderTasks() {
    finishDragging();
    app.orderHint.textContent = canReorderTasks()
        ? "Перетащите задачу за значок ⠿ или используйте кнопки ↑ и ↓. Порядок сохраняется автоматически."
        : "Для изменения порядка выберите «Свой порядок» и сбросьте поиск и фильтры кнопкой «Сбросить фильтры».";
    const visible = getVisibleTasks(tasks, {
        query: app.searchInput.value,
        status: app.statusSelect.value,
        date: app.dateFilter.value,
        sort: app.sortSelect.value
    });
    const fragment = document.createDocumentFragment();

    for (const task of visible) {
        fragment.append(createTaskItem(task));
    }

    app.taskList.replaceChildren(fragment);
    app.taskList.hidden = visible.length === 0;
    app.emptyState.hidden = visible.length > 0;
    app.taskCount.textContent = `Показано: ${visible.length} из ${tasks.length}`;
    app.emptyTitle.textContent = tasks.length ? "Ничего не найдено" : "Пока нет задач";
    app.emptyText.textContent = tasks.length
        ? "Измените условия поиска или сбросьте фильтры."
        : "Добавьте задачу, чтобы начать планирование.";
}

app.searchInput.addEventListener("input", renderTasks);
app.dateFilter.addEventListener("input", renderTasks);
app.statusSelect.addEventListener("change", renderTasks);
app.sortSelect.addEventListener("change", renderTasks);
app.resetFiltersButton.addEventListener("click", () => {
    app.searchInput.value = "";
    app.dateFilter.value = "";
    app.statusSelect.value = "all";
    app.sortSelect.value = "manual";
    renderTasks();
    app.searchInput.focus();
});

app.titleInput.addEventListener("input", () => {
    app.titleInput.setCustomValidity("");
});

app.cancelButton.addEventListener("click", () => {
    resetTaskForm();
    app.titleInput.focus();
});

app.form.addEventListener("submit", event => {
    event.preventDefault();

    const title = app.titleInput.value.trim();
    app.titleInput.setCustomValidity(title ? "" : "Введите название задачи, а не только пробелы.");

    if (!app.form.reportValidity()) {
        return;
    }

    if (editingTaskId !== null) {
        const task = tasks.find(task => task.id === editingTaskId);
        if (!task) {
            resetTaskForm();
            return;
        }
        task.title = title;
        task.date = app.dateInput.value;
    } else {
        tasks.push({
            id: crypto.randomUUID(),
            title,
            date: app.dateInput.value,
            completed: false
        });
    }

    persistTasks();
    renderTasks();
    resetTaskForm();
    app.titleInput.focus();
});

renderTasks();
