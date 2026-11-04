"use strict";

function getReorderedTasks(tasks, sourceId, targetId, position = "before") {
    const result = tasks.slice();
    const sourceIndex = result.findIndex(task => task.id === sourceId);
    const targetIndex = result.findIndex(task => task.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1 || sourceId === targetId) {
        return result;
    }

    const [task] = result.splice(sourceIndex, 1);
    const insertIndex = result.findIndex(item => item.id === targetId);
    result.splice(insertIndex + (position === "after" ? 1 : 0), 0, task);
    return result;
}
