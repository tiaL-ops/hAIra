import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from '../App';
import { auth, serverFirebaseAvailable } from '../../firebase';
import axios from 'axios';
import '../styles/Kanban.css';
// Avatars
import AlexAvatar from '../images/Alex.png';
import BrownAvatar from '../images/Brown.png';
import ElzaAvatar from '../images/Elza.png';
import KatiAvatar from '../images/Kati.png';
import SteveAvatar from '../images/Steve.png';
import SamAvatar from '../images/Sam.png';
import RasoaAvatar from '../images/Rasoa.png';
import RakotoAvatar from '../images/Rakoto.png';
import YouAvatar from '../images/You.png';

// Auth will be handled through useAuth hook and localStorage fallback

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

const getPriorityClass = (priority) => {
  try {
    priority = parseInt(priority);
  } catch (e) {
    priority = 1;
  }
  switch (priority) {
  case 1: return 'priority-low';
  case 2: return 'priority-medium';
  case 3: return 'priority-high';
  case 4: return 'priority-high-fatal';
  default: return '';
  }
};

export default function KanbanBoard({ id }) {
  // const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(initialData);
  const [editingTask, setEditingTask] = useState(null);
  const [priority, setPriority] = useState([]);
  const [teammates, setTeammates] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  
  useEffect(() => {
    let isMounted = true;
    
    // Check authentication with fallback
    const checkAuth = () => {
      if (serverFirebaseAvailable) {
        try {
          return auth.currentUser;
        } catch (error) {
          console.warn('Firebase Auth error, falling back to localStorage:', error);
          // Fall through to localStorage check
        }
      }
      
      // Check localStorage for user
      const storedUser = localStorage.getItem('__localStorage_current_user__');
      return storedUser ? JSON.parse(storedUser) : null;
    };
    
    const currentUser = checkAuth();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Get token with fallback
        let token;
        if (serverFirebaseAvailable) {
          try {
            token = await auth.currentUser.getIdToken(true);
          } catch (error) {
            // Fall back to localStorage token
            token = `mock-token-${currentUser.uid}-${Date.now()}`;
          }
        } else {
          token = `mock-token-${currentUser.uid}-${Date.now()}`;
        }
  const kanbanData = await axios.get(`http://localhost:3002/api/project/${id}/kanban`, { headers: { Authorization: `Bearer ${token}` } });
        const fetchedTasks = kanbanData.data.tasks || {}; // Changed to object
        let data = {todo : [], inProgress : [], done : []};
        
        // Handle the task structure - tasks are objects with id as key and task data as value
        Object.entries(fetchedTasks).forEach(([taskId, taskData]) => {
          let tmp = { 
            id: taskId, 
            name: taskData.description || taskData.title, 
            assignee: taskData.assignedTo, 
            priority: taskData.priority 
          };
          // Map status to our kanban columns, default to 'todo' if status is unknown
          const status = taskData.status === 'inProgress' ? 'inProgress' : 
                        taskData.status === 'done' ? 'done' : 'todo';
          data[status].push(tmp);
        });
        setTasks(data);
        
        // Get teammates from project data
        let team = kanbanData.data.project?.team || [];
        // Filter to get names for the dropdown
        const teammateNames = team.map(t => t.name);
        setTeammates(team);

        const priorityData = await axios.get(`http://localhost:3002/api/project/tasks/priority`, { headers: { Authorization: `Bearer ${token}` } });
        setPriority(priorityData.data.priority);

        // Fetch user profile for human avatar image
        try {
          const profileResp = await axios.get(`http://localhost:3002/api/profile`, { headers: { Authorization: `Bearer ${token}` } });
          if (profileResp?.data?.success && profileResp?.data?.user) {
            setUserProfile(profileResp.data.user);
          }
        } catch (e) {
          console.warn('Unable to load user profile avatar for Kanban human avatar:', e.message);
        }
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
      assignee: teammates.length > 0 ? (teammates[0].id || teammates[0].name) : "",
    };
    
    // Get token with fallback
    let token;
    if (serverFirebaseAvailable) {
      try {
        token = await auth.currentUser.getIdToken(true);
      } catch (error) {
        // Fall back to localStorage token
        const storedUser = localStorage.getItem('__localStorage_current_user__');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        token = `mock-token-${currentUser?.uid || 'anonymous'}-${Date.now()}`;
      }
    } else {
      const storedUser = localStorage.getItem('__localStorage_current_user__');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      token = `mock-token-${currentUser?.uid || 'anonymous'}-${Date.now()}`;
    }
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
    // Get token with fallback
    let token;
    if (serverFirebaseAvailable) {
      try {
        token = await auth.currentUser.getIdToken(true);
      } catch (error) {
        // Fall back to localStorage token
        const storedUser = localStorage.getItem('__localStorage_current_user__');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        token = `mock-token-${currentUser?.uid || 'anonymous'}-${Date.now()}`;
      }
    } else {
      const storedUser = localStorage.getItem('__localStorage_current_user__');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      token = `mock-token-${currentUser?.uid || 'anonymous'}-${Date.now()}`;
    }
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
    // Get token with fallback
    let token;
    if (serverFirebaseAvailable) {
      try {
        token = await auth.currentUser.getIdToken(true);
      } catch (error) {
        // Fall back to localStorage token
        const storedUser = localStorage.getItem('__localStorage_current_user__');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        token = `mock-token-${currentUser?.uid || 'anonymous'}-${Date.now()}`;
      }
    } else {
      const storedUser = localStorage.getItem('__localStorage_current_user__');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      token = `mock-token-${currentUser?.uid || 'anonymous'}-${Date.now()}`;
    }
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

  // Map known AI names/ids to avatars
  const avatarMap = {
    brown: BrownAvatar,
    elza: ElzaAvatar,
    kati: KatiAvatar,
    steve: SteveAvatar,
    sam: SamAvatar,
    rasoa: RasoaAvatar,
    rakoto: RakotoAvatar,
  };

  const getAIAvatar = (nameOrId) => {
    if (!nameOrId) return YouAvatar;
    const lookup = String(nameOrId).toLowerCase();

    // If this is the logged-in human or any human teammate, show You avatar
    const teammate = teammates.find(t => (t.name && t.name.toLowerCase() === lookup) || (t.id && String(t.id).toLowerCase() === lookup));
  if (teammate && teammate.type === 'human') return userProfile?.avatarUrl || YouAvatar;

    // Try id/name mapping for AI
    if (avatarMap[lookup]) return avatarMap[lookup];

    // Try to map known display names to ids
    const nameToId = {
      brown: 'brown', elza: 'elza', kati: 'kati', steve: 'steve', sam: 'sam', rasoa: 'rasoa', rakoto: 'rakoto'
    };
    const normalized = nameToId[lookup];
    if (normalized && avatarMap[normalized]) return avatarMap[normalized];

    // Fallbacks
    return SteveAvatar;
  };

  const columns = [
    { id: "todo", title: "To Do", color: COLOR.dominant },
    { id: "inProgress", title: "In Progress", color: COLOR.second },
    { id: "done", title: "Done", color: COLOR.third },
  ];

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="page-block flex gap-4">
        {columns.map((col) => (
          <Droppable key={col.id} droppableId={col.id}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="page-block-col flex-1 bg-white rounded-xl p-4 shadow-lg"
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
                        className="group rounded-md p-3 mb-3 shadow cursor-pointer relative"
                      >
                        <div className={ getPriorityClass(task.priority) + ' flex justify-between items- rounded-lg' }>
                          <div className="ai-teammate-card" style={{ width: '100%' }}>
                            <div className="ai-avatar"><img src={getAIAvatar(task.assignee)} alt="Alex" className="team-avatar" /></div>
                            <div className="ai-info">
                              <h4>{task.name}</h4>
                              <span className="ai-role">{(() => {
                                const mate = teammates.find(t => String(t.id).toLowerCase() === String(task.assignee || '').toLowerCase());
                                return mate ? mate.name : (task.assignee || 'Unassigned');
                              })()}</span>
                            </div>
                            {/* Disable edit button for tasks in "done" column */}
                            {col.id !== 'done' && (
                              <button
                                onClick={() =>
                                  setEditingTask({ ...task, column: col.id })
                                }
                                className="text-sm text-blue-500 hover:underline opacity-0 group-hover:opacity-100 transition"
                              >
                                Edit
                              </button>
                            )}
                            {col.id === 'done' && (
                              <span className="text-sm text-gray-400 opacity-50">
                                ✓ Done
                              </span>
                            )}
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
                            <div className="flex items-center gap-2 mb-2">
                              <img src={getAIAvatar(editingTask.assignee)} alt="assignee" className="team-avatar" />
                              <span className="text-sm text-gray-600">Assignee</span>
                            </div>
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
                              {teammates.map((teammate) => (
                                <option key={teammate.id || teammate.name} value={teammate.id || teammate.name}>
                                  {teammate.name} - {teammate.role}
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
                  className="mt-2 w-full bg-[#408F8C] text-white rounded-md py-2 hover:brightness-95 border border-[#2b5e5c] shadow"
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
  );
}

