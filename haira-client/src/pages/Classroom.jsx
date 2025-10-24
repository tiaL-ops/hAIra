import { useState, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import axios from 'axios';
import { AI_TEAMMATES } from '../../../haira-server/config/aiAgents.js';
import '../styles/Classroom.css';

// Import all agent avatars
import BrownAvatar from '../images/Brown.png';
import ElzaAvatar from '../images/Elza.png';
import KatiAvatar from '../images/Kati.png';
import SteveAvatar from '../images/Steve.png';
import SamAvatar from '../images/Sam.png';
import RasoaAvatar from '../images/Rasoa.png';
import RakotoAvatar from '../images/Rakoto.png';

function Classroom() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [message, setMessage] = useState("...");
    const [isInitializing, setIsInitializing] = useState(false);
    const [teammates, setTeammates] = useState([]);
    const [isActivated, setIsActivated] = useState(false);
    const [selectedAgents, setSelectedAgents] = useState([]);
    
    const avatarMap = {
        brown: BrownAvatar,
        elza: ElzaAvatar,
        kati: KatiAvatar,
        steve: SteveAvatar,
        sam: SamAvatar,
        rasoa: RasoaAvatar,
        rakoto: RakotoAvatar
    };
    
    const availableAgents = ['brown', 'elza', 'kati', 'steve', 'sam', 'rasoa', 'rakoto'];

    // Tracks which agent is in the "preview" box. Default to the first one.
    const [activeAgentId, setActiveAgentId] = useState(availableAgents[0]);

    useEffect(() => {
        checkClassroomStatus();
    }, [id]);

    const checkClassroomStatus = async () => {
        if (!id) return;
        
        try {
            const token = await auth.currentUser.getIdToken(true);
            const response = await axios.get(
                `http://localhost:3002/api/project/${id}/chat`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (response.data.teammates && Object.keys(response.data.teammates).length > 1) {
                setIsActivated(true);
                setTeammates(Object.values(response.data.teammates).filter(t => t.type === 'ai'));
                setMessage("Classroom is active! Your AI teammates are ready.");
            } else {
                setMessage("Pick your team! Select up to 2 AI teammates.");
            }
        } catch (error) {
            console.error('Error checking classroom status:', error);
            setMessage("Pick your team! Select up to 2 AI teammates.");
        }
    };
    
    const toggleAgentSelection = (agentId) => {
        setSelectedAgents(prev => {
            if (prev.includes(agentId)) {
                return prev.filter(id => id !== agentId);
            } else if (prev.length < 2) {
                return [...prev, agentId];
            } else {
                alert('You can only select up to 2 teammates! Deselect one first.');
                return prev;
            }
        });
    };

    const activateClassroom = async () => {
        if (!id) {
            alert('No project selected. Please select a project first.');
            return;
        }
        
        if (selectedAgents.length === 0) {
            alert('Please select at least 1 teammate (up to 2).');
            return;
        }

        setIsInitializing(true);
        setMessage(`🏫 Initializing classroom with ${selectedAgents.length} AI teammate(s)...`);

        try {
            const token = await auth.currentUser.getIdToken(true);
            
            const response = await axios.post(
                `http://localhost:3002/api/project/${id}/init-teammates`,
                { selectedAgents },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setMessage(`✅ Classroom activated! ${response.data.count} teammates ready.`);
                setIsActivated(true);
                
                await checkClassroomStatus();
                
                setTimeout(() => {
                    navigate(`/project/${id}/chat`);
                }, 2000);
            }
        } catch (error) {
            console.error('Error activating classroom:', error);
            setMessage(`❌ Error: ${error.response?.data?.error || 'Failed to activate classroom'}`);
        } finally {
            setIsInitializing(false);
        }
    };

    // Helper variables for the render logic
    const activeAgent = AI_TEAMMATES[activeAgentId];
    const isSelected = selectedAgents.includes(activeAgentId);

    //Render
    return (
        <div className="classroom-container-pixel">
            
            {!isActivated && (
                <>
                    {/* This wrapper holds all content *except* the activate button */}
                    <div className="classroom-content-wrapper">
                        <div className="classroom-header-pixel">
                            <h1>🏫 Pick Your Team!</h1>
                            <p>{message}</p>
                            <p style={{fontSize: "0.7rem"}}>Selected: {selectedAgents.length} / 2</p>
                        </div>

                        {/* This is the "Preview" area at the TOP */}
                        <div className="character-preview-area">
                            <div className="teammate-info-container">
                                <div className="teammate-avatar-pixel" style={{ borderColor: activeAgent.color }}>
                                    <img 
                                        src={avatarMap[activeAgentId]} 
                                        alt={activeAgent.name}
                                    />
                                </div>

                                <div className="teammate-info-pixel">
                                    <h3 style={{ color: activeAgent.color }}>
                                        {activeAgent.name}
                                    </h3>
                                    <p className="role">{activeAgent.role}</p>
                                    <p className="personality">{activeAgent.personality}</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => toggleAgentSelection(activeAgentId)}
                                className={`select-button-pixel ${isSelected ? 'selected' : ''}`}
                            >
                                {isSelected ? '✓ Deselected' : 'Select Teammate'}
                            </button>
                        </div>

                        {/* This is the "Roster" at the BOTTOM */}
                        <div className="character-roster-area">
                            {availableAgents.map(agentId => {
                                const agent = AI_TEAMMATES[agentId];
                                const isAgentSelected = selectedAgents.includes(agentId);
                                const isAgentActive = activeAgentId === agentId;

                                return (
                                    <div 
                                        key={agentId}
                                        className={`roster-avatar ${isAgentActive ? 'active' : ''} ${isAgentSelected ? 'selected' : ''}`}
                                        onClick={() => setActiveAgentId(agentId)}
                                        style={{ borderColor: isAgentActive ? agent.color : '#aaa' }}
                                    >
                                        <img 
                                            src={avatarMap[agentId]} 
                                            alt={agent.name}
                                        />
                                        {isAgentSelected && (
                                            <div className="selected-check">✓</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* The activate button is now a direct child of the flex container */}
                    <button
                        onClick={activateClassroom}
                        disabled={isInitializing || !id || selectedAgents.length === 0}
                        className="activate-button-pixel"
                    >
                        {isInitializing ? '⏳ Activating...' : `🚀 Activate Team!`}
                    </button>
                </>
            )}

            {/* This is the "Activated" view */}
            {isActivated && teammates.length > 0 && (
                <div className="activated-section-pixel">
                    <h2>👥 Your AI Teammates</h2>
                    <div className="activated-grid-pixel">
                        {teammates.map(teammate => (
                            <div 
                                key={teammate.id}
                                className="activated-card-pixel"
                            >
                                <div className="teammate-avatar-pixel" style={{ borderColor: teammate.color }}>
                                    <img 
                                        src={avatarMap[teammate.id]} 
                                        alt={teammate.name}
                                    />
                                </div>
                                <h3 style={{ color: teammate.color || '#333' }}>
                                    {teammate.name}
                                </h3>
                                <p className="role">
                                    {teammate.role}
                                </p>
                            </div>
                        ))}
                    </div>
                    
                    <div className="activated-nav-buttons">
                        <button
                            onClick={() => navigate(`/project/${id}/chat`)}
                            className="nav-link-button"
                            style={{ backgroundColor: '#2196F3' }}
                        >
                            💬 Go to Chat
                        </button>
                        <button
                            onClick={() => navigate(`/project/${id}/kanban`)}
                            className="nav-link-button"
                            style={{ backgroundColor: '#FF69B4', color: '#111' }}
                        >
                            📋 Go to Kanban
                        </button>
                        <button
                            onClick={() => navigate(`/project/${id}/submission`)}
                            className="nav-link-button"
                            style={{ backgroundColor: '#7C4DFF' }}
                        >
                            🚀 Go to Submission
                        </button>
                    </div>
                </div>
            )}

            {!id && (
                <p style={{ marginTop: '30px', color: '#ff5722', fontWeight: 'bold' }}>
                    ⚠️ Please select a project first.
                </p>
            )}
        </div>
    );
}

export default Classroom;