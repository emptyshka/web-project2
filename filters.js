"use strict";

function getVisibleTasks(tasks, filters) {
    const query = filters.query.trim().toLowerCase();
    const visible = tasks.filter(task => {
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesStatus = filters.status === "all" ||
            (filters.status === "completed" ? task.completed : !task.completed);
        const matchesDate = !filters.date || task.date === filters.date;
        return matchesTitle && matchesStatus && matchesDate;
    });

    if (filters.sort === "date-asc") {
        visible.sort((first, second) => first.date.localeCompare(second.date));
    } else if (filters.sort === "date-desc") {
        visible.sort((first, second) => second.date.localeCompare(first.date));
    }

    return visible;
}
