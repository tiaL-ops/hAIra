import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const COLORS = {
  dominant: "#408F8C",
  second: "#9169C0",
  third: "#B4565A",
  fourth: "#93C263",
};

const initialTasks = {
  todo: [
    { id: "1", name: "Task 1", assignee: "Alice" },
    { id: "2", name: "Task 2", assignee: "Bob" },
  ],
  inProgress: [
    { id: "3", name: "Task 3", assignee: "Charlie" },
  ],
  done: [
    { id: "4", name: "Task 4", assignee: "Diana" },
  ],
};

export default function KanbanBoard() {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const sourceCol = result.source.droppableId;
    const destCol = result.destination.droppableId;

    const sourceTasks = Array.from(tasks[sourceCol]);
    const [movedTask] = sourceTasks.splice(result.source.index, 1);

    if (sourceCol === destCol) {
      sourceTasks.splice(result.destination.index, 0, movedTask);
      setTasks({ ...tasks, [sourceCol]: sourceTasks });
    } else {
      const destTasks = Array.from(tasks[destCol]);
      destTasks.splice(result.destination.index, 0, movedTask);
      setTasks({ ...tasks, [sourceCol]: sourceTasks, [destCol]: destTasks });
    }
  };

  const openModal = (task, col) => {
    setSelectedTask({ ...task, col });
    setModalVisible(true);
  };

  const handleSave = () => {
    const { col, id, name, assignee } = selectedTask;
    setTasks({
      ...tasks,
      [col]: tasks[col].map((t) => (t.id === id ? { id, name, assignee } : t)),
    });
    setModalVisible(false);
  };

  const handleDelete = () => {
    const { col, id } = selectedTask;
    setTasks({
      ...tasks,
      [col]: tasks[col].filter((t) => t.id !== id),
    });
    setModalVisible(false);
  };

  const handleAddTask = (col) => {
    const id = Date.now().toString();
    const newTask = { id, name: "New Task", assignee: "" };
    setTasks({ ...tasks, [col]: [...tasks[col], newTask] });
    openModal({ ...newTask }, col);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4">
          {["todo", "inProgress", "done"].map((colKey, idx) => {
            const colName =
              colKey === "todo" ? "To Do" : colKey === "inProgress" ? "In Progress" : "Done";
            const color =
              idx === 0 ? COLORS.dominant : idx === 1 ? COLORS.second : COLORS.third;
            return (
              <div key={colKey} className="flex-1 bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="font-bold text-lg" style={{ color }}>
                    {colName}
                  </h2>
                  <button
                    onClick={() => handleAddTask(colKey)}
                    className="bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                  >
                    + Add
                  </button>
                </div>
                <Droppable droppableId={colKey}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {tasks[colKey].map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => openModal(task, colKey)}
                              className="bg-gray-50 p-3 rounded shadow cursor-pointer hover:bg-gray-100"
                            >
                              <div className="font-semibold">{task.name}</div>
                              <div className="text-sm text-gray-500">{task.assignee}</div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 space-y-4">
            <h3 className="text-lg font-bold">Edit Task</h3>
            <input
              type="text"
              className="border p-2 w-full rounded"
              value={selectedTask.name}
              onChange={(e) =>
                setSelectedTask({ ...selectedTask, name: e.target.value })
              }
            />
            <input
              type="text"
              className="border p-2 w-full rounded"
              placeholder="Assignee"
              value={selectedTask.assignee}
              onChange={(e) =>
                setSelectedTask({ ...selectedTask, assignee: e.target.value })
              }
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleDelete}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={handleSave}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Save
              </button>
            </div>
            <button
              onClick={() => setModalVisible(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
