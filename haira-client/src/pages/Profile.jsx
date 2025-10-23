import { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import '../styles/Profile.css';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const navigate = useNavigate();
  const auth = getAuth();

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const token = await auth.currentUser.getIdToken();
        
        const response = await axios.get("http://localhost:3002/api/profile", {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        setProfile(response.data.user);
        setLanguage(response.data.user.preferences.language || 'en');
        setLoading(false);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data. Please try again.");
        setLoading(false);
      }
    };

    fetchProfile();
  }, [auth, navigate]);

  // Handle language change
  const handleLanguageChange = async (newLanguage) => {
    if (language === newLanguage || !auth.currentUser) return;

    try {
      setSaving(true);
      const token = await auth.currentUser.getIdToken();
      
      await axios.patch("http://localhost:3002/api/profile/preferences", 
        { language: newLanguage },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setLanguage(newLanguage);
      setSaveMessage('Language preference saved');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveMessage('');
      }, 3000);
    } catch (err) {
      console.error("Error updating language preference:", err);
      setSaveMessage('Failed to save language preference');
    } finally {
      setSaving(false);
    }
  };

  // Render achievement badges
  const renderAchievements = (achievements) => {
    if (!achievements || achievements.length === 0) {
      return <p className="no-achievements">No achievements yet</p>;
    }

    const achievementLabels = {
      'first_project': 'First Project',
      'team_leader': 'Team Leader',
      'high_grade': 'High Grade',
      'fast_learner': 'Fast Learner'
    };

    return (
      <div className="achievements-container">
        {achievements.map(achievement => (
          <div key={achievement} className="achievement-badge">
            {achievementLabels[achievement] || achievement}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="profile-container loading">Loading profile...</div>;
  }

  if (error) {
    return <div className="profile-container error">{error}</div>;
  }

  if (!profile) {
    return <div className="profile-container error">Profile not found</div>;
  }

  return (
    <div className="profile-container">
      <h1 className="profile-title">My Profile</h1>
      
      <div className="profile-section user-info">
        <h2>User Information</h2>
        <div className="info-item">
          <span className="label">Name:</span>
          <span className="value">{profile.name}</span>
        </div>
        <div className="info-item">
          <span className="label">Email:</span>
          <span className="value">{profile.email}</span>
        </div>
        {profile.activeProject && (
          <div className="info-item">
            <span className="label">Active Project:</span>
            <span className="value">{profile.activeProject.title} ({profile.activeProject.status})</span>
          </div>
        )}
      </div>
      
      <div className="profile-section user-stats">
        <h2>Profile Summary</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{profile.summary.xp}</div>
            <div className="stat-label">XP</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{profile.summary.level}</div>
            <div className="stat-label">Level</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{profile.summary.totalProjectsCompleted}</div>
            <div className="stat-label">Projects Completed</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{profile.summary.averageGrade?.toFixed(1) || '0'}</div>
            <div className="stat-label">Average Grade</div>
          </div>
        </div>
      </div>
      
      <div className="profile-section achievements">
        <h2>Achievements</h2>
        {renderAchievements(profile.summary.achievements)}
      </div>
      
      <div className="profile-section preferences">
        <h2>Settings</h2>
        <div className="preference-item">
          <span className="preference-label">Language:</span>
          <div className="language-selector">
            <button 
              className={`language-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
              disabled={saving || language === 'en'}
            >
              English
            </button>
            <button 
              className={`language-btn ${language === 'fr' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('fr')}
              disabled={saving || language === 'fr'}
            >
              Français
            </button>
          </div>
          {saveMessage && <div className="save-message">{saveMessage}</div>}
        </div>
      </div>
    </div>
  );
}

export default Profile;