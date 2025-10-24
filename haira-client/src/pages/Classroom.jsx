import { useState, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import axios from 'axios';

function Classroom() {
    const { id } = useParams(); // Get project ID from URL
    const navigate = useNavigate();
    
    // State to retrieve the message from backend
    const [message, setMessage] = useState("...");
    const [isInitializing, setIsInitializing] = useState(false);
    const [teammates, setTeammates] = useState([]);
    const [isActivated, setIsActivated] = useState(false);

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
                setMessage("Classroom not yet activated. Click the button below to begin!");
            }
        } catch (error) {
            console.error('Error checking classroom status:', error);
            setMessage("Ready to activate your classroom!");
        }
    };

    const activateClassroom = async () => {
        if (!id) {
            alert('No project selected. Please select a project first.');
            return;
        }

        setIsInitializing(true);
        setMessage("🏫 Initializing classroom with AI teammates...");

        try {
            const token = await auth.currentUser.getIdToken(true);
            
            const response = await axios.post(
                `http://localhost:3002/api/project/${id}/init-teammates`,
                {},
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
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>🏫 Classroom</h1>
            <p style={{ fontSize: '18px', marginTop: '20px' }}>{message}</p>

            {!isActivated && (
                <button
                    onClick={activateClassroom}
                    disabled={isInitializing || !id}
                    style={{
                        marginTop: '30px',
                        padding: '15px 30px',
                        fontSize: '16px',
                        backgroundColor: isInitializing ? '#ccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isInitializing ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {isInitializing ? '⏳ Activating...' : '🚀 Activate Classroom'}
                </button>
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
                                <div style={{ fontSize: '48px', marginBottom: '10px' }}>
                                    {teammate.avatar || '🤖'}
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
                    
                    <button
                        onClick={() => navigate(`/project/${id}/chat`)}
                        style={{
                            marginTop: '30px',
                            padding: '15px 30px',
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
