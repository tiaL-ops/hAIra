import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { v4 as uuidv4 } from "uuid";
import { getAuth } from 'firebase/auth';
import { useAuth } from '../App';
import axios from 'axios';

const auth = getAuth();

const COLOR = {
  dominant: "#408F8C",
  second: "#9169C0",
  third: "#B4565A",
  fourth: "#93C263",
};

const initialData = {
  todo: [],
  inProgress: [],
  done: [],
};

const assignees = ["You", "Alex", "Sam", "Rakoto", "Rasoa"];

export default function KanbanBoard() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(initialData);
  const [editingTask, setEditingTask] = useState(null);
  const [priority, setPriority] = useState([]);
  
useEffect(() => {
    let isMounted = true;
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const token = await auth.currentUser.getIdToken(true);
        const kanbanData = await axios.get(`http://localhost:3002/api/project/${id}/kanban`, { headers: { Authorization: `Bearer ${token}` } });
        const tasks = kanbanData.data.tasks;
        let data = {todo : [], inProgress : [], done : []};
        tasks.map((item) => {
          let tmp = { id: item.id, name: item.description, assignee: item.assignedTo, priority: item.priority};
          data[item.status].push(tmp);
        });
        setTasks(data);

        const priorityData = await axios.get(`http://localhost:3002/api/project/tasks/priority`, { headers: { Authorization: `Bearer ${token}` } });
        setPriority(priorityData.data.priority);
     }
      catch (err) {
        console.error('[Client] Error fetching data:', err);
        const errorMessage = err.response?.status === 404 ? 'Project not found. Please check the project ID.' : err.message || 'Error loading chat data';
       
        if (err.response?.status === 404) setTimeout(() => navigate('/'), 3000);
      }
    };
    fetchData();
  }, []);

  const handleAddTask = async (column) => {
    const newTask = {
      id: uuidv4(),
      name: "New task",
      assignee: assignees[0],
    };
    const token = await auth.currentUser.getIdToken(true);
    const data = { title : id, taskUserId : newTask.assignee , status : column, description : newTask.name };
    const kanbanData = await axios.post(
      `http://localhost:3002/api/project/${id}/tasks`,
      data,
      { headers: { Authorization: `Bearer ${token}` } });
    if (kanbanData.data.success) {
      newTask.id = kanbanData.data[0].id;
      newTask.priority = kanbanData.data[0].priority;
      setTasks({
        ...tasks,
        [column]: [...tasks[column], newTask],
      });
    } else {
      alert('no task added!');
    }
  
  };

  const handleSaveTask = async (column, task, updateState = true) => {
    const token = await auth.currentUser.getIdToken(true);
    const data = { taskId : task.id, title : id, status : column, userId : task.assignee , description : task.name, priority : task.priority };
    const kanbanData = await axios.put(
      `http://localhost:3002/api/project/${id}/tasks`,
      data,
      { headers: { Authorization: `Bearer ${token}` } });
    if (!updateState)
      return;
    if (kanbanData.data.success) {
      setTasks({
        ...tasks,
        [column]: tasks[column].map((t) =>
          t.id === task.id ? task : t
        ),
      });
      setEditingTask(null);
    } else {
      alert('no task saved');
    }
  };

  const handleDeleteTask = async (column, taskId) => {
    const token = await auth.currentUser.getIdToken(true);
    const data = { taskId : taskId };
    const kanbanData = await axios.delete(
      `http://localhost:3002/api/project/${id}/tasks`,
      { headers: { Authorization: `Bearer ${token}` }, data: data });
    if (kanbanData.data.success) {
      setTasks({
        ...tasks,
        [column]: tasks[column].filter((t) => t.id !== taskId),
      });
      setEditingTask(null);
    } else {
      alert('no task deleted');
    }
  };
 
  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination || source == destination)
      return;

    const sourceCol = [...tasks[source.droppableId]];
    const [moved] = sourceCol.splice(source.index, 1);

    // if 
    let destCol = [];
    if (source.droppableId === destination.droppableId)
      destCol = [...sourceCol];
    else
      destCol = [...tasks[destination.droppableId]];
    destCol.splice(destination.index, 0, moved);

    handleSaveTask(destination.droppableId, moved, false);
    setTasks({
      ...tasks,
      [source.droppableId]: sourceCol,
      [destination.droppableId]: destCol,
    });
  };

  const columns = [
    { id: "todo", title: "To Do", color: COLOR.dominant },
    { id: "inProgress", title: "In Progress", color: COLOR.second },
    { id: "done", title: "Done", color: COLOR.third },
  ];

  const getAIAvatar = (name) => {
    // default avatar image
    if (!assignees.includes(name))
      return '/src/images/Alex.png';

    return '/src/images/' + name + '.png';
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="editor-container flex gap-4">
          {columns.map((col) => (
            <Droppable key={col.id} droppableId={col.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="main-editor flex-1 bg-white rounded-xl p-4 shadow-lg"
                >
                  <div
                    className="add-comment-btn text-center"
                    style={{ backgroundColor: col.color }}
                  >
                    {col.title}
                  </div>

                  {tasks[col.id].map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="group bg-gray-50 rounded-md p-3 mb-3 shadow cursor-pointer relative"
                        >
                          <div className="flex justify-between items-center">
                            <div className="ai-teammate-card" style={{ width: '100%' }}>
                              <div className="ai-avatar"><img src={getAIAvatar(task.assignee)} alt="Alex" className="team-avatar" />;</div>
                              <div className="ai-info">
                                <h4>{task.name}</h4>
                                <span className="ai-role">{task.assignee}</span>
                              </div>
                              <button
                                onClick={() =>
                                  setEditingTask({ ...task, column: col.id })
                                }
                                className="text-sm text-blue-500 hover:underline opacity-0 group-hover:opacity-100 transition"
                              >
                                Edit
                              </button>
                            </div>
                            {/* <div>
                              <div className="font-medium">{task.name}</div>
                              <div className="text-sm text-gray-500">
                                {task.assignee}
                              </div>
                              <div className="text-sm text-gray-500">{priority.find(item => item.value == task.priority)?.name}</div>
                            </div> */}
                          </div>

                          {editingTask && editingTask.id === task.id && (
                            <div className="absolute top-full left-0 mt-2 p-2 w-64 bg-white border rounded shadow z-10" style={{ width: '100%' }}>
                              <input
                                type="text"
                                className="w-full border p-1 rounded mb-2"
                                value={editingTask.name}
                                onChange={(e) =>
                                  setEditingTask({
                                    ...editingTask,
                                    name: e.target.value,
                                  })
                                }
                              />
                              <select
                                className="w-full border p-1 rounded mb-2"
                                value={editingTask.assignee}
                                onChange={(e) =>
                                  setEditingTask({
                                    ...editingTask,
                                    assignee: e.target.value,
                                  })
                                }
                              >
                                {assignees.map((a) => (
                                  <option key={a} value={a}>
                                    {a}
                                  </option>
                                ))}
                              </select>
                              <select
                                className="w-full border p-1 rounded mb-2"
                                value={editingTask.priority}
                                onChange={(e) =>
                                  setEditingTask({
                                    ...editingTask,
                                    priority: e.target.value,
                                  })
                                }
                              >
                                {priority.map((p) => (
                                  <option key={p.value} value={p.value}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                              <div className="flex justify-between">
                                <button
                                  className="bg-green-500 text-white px-2 py-1 rounded"
                                  onClick={() =>
                                    handleSaveTask(col.id, editingTask)
                                  }
                                >
                                  Save
                                </button>
                                <button
                                  className="bg-red-500 text-white px-2 py-1 rounded"
                                  onClick={() =>
                                    handleDeleteTask(col.id, task.id)
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  <button
                    className="mt-2 w-full bg-gray-200 text-gray-800 rounded-md py-1 hover:bg-gray-300"
                    onClick={() => handleAddTask(col.id)}
                  >
                    + Add Task
                  </button>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

