import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";


const initialTasks = [
  { id: "1", title: "Accessibility", assignedTo: "Chloe", status: "todo" },
  { id: "2", title: "HAV TO IA", assignedTo: "Noah", status: "todo" },
  { id: "3", title: "Priority", assignedTo: "Bob", status: "inprogress" },
  { id: "4", title: "Review UI comp", assignedTo: "Noah", status: "done" },
];

const columnsData = {
  todo: {
    name: "To Do",
    color: "bg-purple-300",
    items: initialTasks.filter(t => t.status === "todo"),
  },
  inprogress: {
    name: "In Progress",
    color: "bg-purple-200",
    items: initialTasks.filter(t => t.status === "inprogress"),
  },
  done: {
    name: "Done",
    color: "bg-green-200",
    items: initialTasks.filter(t => t.status === "done"),
  },
};

export default function KanbanBoard() {
  const [columns, setColumns] = useState(columnsData);

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const sourceCol = columns[source.droppableId];
    const destCol = columns[destination.droppableId];
    const sourceItems = [...sourceCol.items];
    const destItems = [...destCol.items];

    const [movedItem] = sourceItems.splice(source.index, 1);
    destItems.splice(destination.index, 0, movedItem);

    setColumns({
      ...columns,
      [source.droppableId]: { ...sourceCol, items: sourceItems },
      [destination.droppableId]: { ...destCol, items: destItems },
    });
  };

  return (
    <div className="min-h-screen bg-teal-700 flex flex-col items-center py-10">
      <h1 className="text-4xl font-bold text-white mb-6">Kanban Board</h1>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6">
          {Object.entries(columns).map(([colId, col]) => (
            <div
              key={colId}
              className={`w-72 p-4 rounded-2xl shadow-lg ${col.color}`}
            >
              <h2 className="text-xl font-bold mb-4">{col.name}</h2>
              <Droppable droppableId={colId}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`min-h-[200px] rounded-lg p-2 transition ${
                      snapshot.isDraggingOver ? "bg-teal-100" : ""
                    }`}
                  >
                    {col.items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-3 mb-3 rounded-lg shadow ${
                              snapshot.isDragging ? "rotate-2 scale-105" : ""
                            }`}
                          >
                            <p className="font-semibold">{item.title}</p>
                            <p className="text-sm text-gray-500">{item.assignedTo}</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <button className="bg-teal-600 text-white px-3 py-2 w-full rounded-lg mt-2 hover:bg-teal-700">
                + Add task
              </button>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
