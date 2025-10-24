import { useState, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import axios from 'axios';
import { AI_TEAMMATES } from '../../../haira-server/config/aiAgents.js';

// Import all agent avatars
import BrownAvatar from '../images/Brown.png';
import ElzaAvatar from '../images/Elza.png';
import KatiAvatar from '../images/Kati.png';
import SteveAvatar from '../images/Steve.png';
import SamAvatar from '../images/Sam.png';
import RasoaAvatar from '../images/Rasoa.png';
import RakotoAvatar from '../images/Rakoto.png';

function Classroom() {
    const { id } = useParams(); // Get project ID from URL
    const navigate = useNavigate();
    
    // State to retrieve the message from backend
    const [message, setMessage] = useState("...");
    const [isInitializing, setIsInitializing] = useState(false);
    const [teammates, setTeammates] = useState([]);
    const [isActivated, setIsActivated] = useState(false);
    const [selectedAgents, setSelectedAgents] = useState([]); // Track selected agents
    
    // Avatar mapping
    const avatarMap = {
        brown: BrownAvatar,
        elza: ElzaAvatar,
        kati: KatiAvatar,
        steve: SteveAvatar,
        sam: SamAvatar,
        rasoa: RasoaAvatar,
        rakoto: RakotoAvatar
    };
    
    // All available AI agents - now includes all 7!
    const availableAgents = ['brown', 'elza', 'kati', 'steve', 'sam', 'rasoa', 'rakoto'];

    // Check if classroom is already activated (teammates exist)
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
            
            // Check if teammates exist
            if (response.data.teammates && Object.keys(response.data.teammates).length > 1) {
                setIsActivated(true);
                setTeammates(Object.values(response.data.teammates).filter(t => t.type === 'ai'));
                setMessage("Classroom is active! Your AI teammates are ready.");
            } else {
                setMessage("Select up to 2 AI teammates to join your project!");
            }
        } catch (error) {
            console.error('Error checking classroom status:', error);
            setMessage("Select up to 2 AI teammates to join your project!");
        }
    };
    
    const toggleAgentSelection = (agentId) => {
        setSelectedAgents(prev => {
            if (prev.includes(agentId)) {
                // Deselect the agent
                return prev.filter(id => id !== agentId);
            } else if (prev.length < 2) {
                // Select the agent (max 2)
                return [...prev, agentId];
            } else {
                // Already have 2 selected, show message
                alert('You can only select up to 2 teammates!');
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
                { selectedAgents }, // Send selected agents to backend
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setMessage(`✅ Classroom activated! ${response.data.count} teammates ready.`);
                setIsActivated(true);
                
                // Fetch teammates list
                await checkClassroomStatus();
                
                // Redirect to chat after 2 seconds
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

    //Render
    return (
        <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
            <h1>🏫 Classroom</h1>
            <p style={{ fontSize: '18px', marginTop: '20px' }}>{message}</p>

            {!isActivated && (
                <>
                    <div style={{ marginTop: '40px', marginBottom: '30px' }}>
                        <h2>👥 Available AI Teammates (Select up to 2)</h2>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                            Click on teammates to select them. Selected: {selectedAgents.length}/2
                        </p>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                            gap: '20px', 
                            marginTop: '20px' 
                        }}>
                            {availableAgents.map(agentId => {
                                const agent = AI_TEAMMATES[agentId];
                                const isSelected = selectedAgents.includes(agentId);
                                return (
                                    <div 
                                        key={agentId}
                                        onClick={() => toggleAgentSelection(agentId)}
                                        style={{
                                            padding: '20px',
                                            border: isSelected ? `3px solid ${agent.color}` : '2px solid #e0e0e0',
                                            borderRadius: '12px',
                                            backgroundColor: isSelected ? `${agent.color}15` : '#f9f9f9',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                            boxShadow: isSelected ? `0 4px 12px ${agent.color}40` : 'none'
                                        }}
                                    >
                                        <div style={{ 
                                            width: '80px', 
                                            height: '80px', 
                                            marginBottom: '10px',
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            border: `3px solid ${agent.color}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 10px auto'
                                        }}>
                                            <img 
                                                src={avatarMap[agentId]} 
                                                alt={agent.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                        <h3 style={{ margin: '10px 0', color: agent.color }}>
                                            {agent.name}
                                        </h3>
                                        <p style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', marginBottom: '8px' }}>
                                            {agent.role}
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#888', lineHeight: '1.4' }}>
                                            {agent.personality.substring(0, 80)}...
                                        </p>
                                        {isSelected && (
                                            <div style={{ 
                                                marginTop: '10px', 
                                                padding: '4px 8px', 
                                                backgroundColor: agent.color,
                                                color: 'white',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                textAlign: 'center'
                                            }}>
                                                ✓ Selected
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    <button
                        onClick={activateClassroom}
                        disabled={isInitializing || !id || selectedAgents.length === 0}
                        style={{
                            marginTop: '30px',
                            padding: '15px 30px',
                            fontSize: '16px',
                            backgroundColor: (isInitializing || selectedAgents.length === 0) ? '#ccc' : '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: (isInitializing || selectedAgents.length === 0) ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {isInitializing ? '⏳ Activating...' : `🚀 Activate Classroom (${selectedAgents.length} teammate${selectedAgents.length !== 1 ? 's' : ''})`}
                    </button>
                </>
            )}

            {isActivated && teammates.length > 0 && (
                <div style={{ marginTop: '40px' }}>
                    <h2>👥 Your AI Teammates</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
                        {teammates.map(teammate => (
                            <div 
                                key={teammate.id}
                                style={{
                                    padding: '20px',
                                    border: '2px solid #e0e0e0',
                                    borderRadius: '12px',
                                    backgroundColor: '#f9f9f9'
                                }}
                            >
                                <div style={{ 
                                    width: '80px', 
                                    height: '80px', 
                                    marginBottom: '10px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: `3px solid ${teammate.color}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 10px auto'
                                }}>
                                    <img 
                                        src={avatarMap[teammate.id]} 
                                        alt={teammate.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <h3 style={{ margin: '10px 0', color: teammate.color || '#333' }}>
                                    {teammate.name}
                                </h3>
                                <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                                    {teammate.role}
                                </p>
                            </div>
                        ))}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', marginTop: '30px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => navigate(`/project/${id}/chat`)}
                            style={{
                                padding: '12px 20px',
                                fontSize: '16px',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            💬 Go to Chat
                        </button>
                        <button
                            onClick={() => navigate(`/project/${id}/kanban`)}
                            style={{
                                padding: '12px 20px',
                                fontSize: '16px',
                                backgroundColor: '#FF69B4',
                                color: '#111',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            📋 Go to Kanban
                        </button>
                        <button
                            onClick={() => navigate(`/project/${id}/submission`)}
                            style={{
                                padding: '12px 20px',
                                fontSize: '16px',
                                backgroundColor: '#7C4DFF',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            � Go to Submission
                        </button>
                    </div>
                </div>
            )}

            {!id && (
                <p style={{ marginTop: '30px', color: '#ff5722', fontWeight: 'bold' }}>
                    ⚠️ Please select a project first from the project selection page.
                </p>
            )}
        </div>
    );
}

export default Classroom;
