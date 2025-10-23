import { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import '../styles/Profile.css';
import bg from '../images/backgroundsky.png'; // put your image here

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const navigate = useNavigate();
  const auth = getAuth();

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
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setProfile(response.data.user);
        setLanguage(response.data.user?.preferences?.language || 'en');
        setLoading(false);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data. Please try again.");
        setLoading(false);
      }
    };

    fetchProfile();
  }, [auth, navigate]);

  const handleLanguageChange = async (newLanguage) => {
    if (language === newLanguage || !auth.currentUser) return;

    try {
      setSaving(true);
      const token = await auth.currentUser.getIdToken();
      await axios.patch("http://localhost:3002/api/profile/preferences", 
        { language: newLanguage },
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      setLanguage(newLanguage);
      setSaveMessage('Language preference saved');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error("Error updating language preference:", err);
      setSaveMessage('Failed to save language preference');
    } finally {
      setSaving(false);
    }
  };

  const renderAchievements = (achievements) => {
    if (!achievements || achievements.length === 0) {
      return <p className="no-achievements">No achievements yet</p>;
    }

    const labels = {
      'first_project': 'First Project',
      'team_leader': 'Team Leader',
      'high_grade': 'High Grade',
      'fast_learner': 'Fast Learner'
    };

    return (
      <div className="achievements-container">
        {achievements.map(a => (
          <div key={a} className="achievement-badge">
            {labels[a] || a}
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="profile-wrapper loading">Loading profile...</div>;
  if (error) return <div className="profile-wrapper error">{error}</div>;
  if (!profile) return <div className="profile-wrapper error">Profile not found</div>;

  return (
    <div className="profile-wrapper">
      <div className="overlay">
        <header className="top-header">
          <div className="avatar-circle">
            <input 
              type="file" 
              id="avatar-upload" 
              accept="image/*" 
              style={{ display: 'none' }}
            />
            <label htmlFor="avatar-upload" className="avatar-label">
              + Add Picture
            </label>
          </div>
          <div className="user-ident">
            <div className="info-line">
              <span className="info-label">Name:</span>
              <span className="info-value">{profile.name || 'User'}</span>
            </div>
            <div className="info-line">
              <span className="info-label">Email:</span>
              <span className="info-value">{profile.email || 'N/A'}</span>
            </div>
            {profile.activeProject && (
              <div className="info-line">
                <span className="info-label">Project:</span>
                <span className="info-value">{profile.activeProject.title}</span>
              </div>
            )}
          </div>
        </header>

        <h2 className="section-title">SCHOOL</h2>

        <main className="main-grid">
          <div className="left-col">
            <div className="game-card white">
              <div className="card-text">Level: {profile.summary?.level ?? 0}</div>
            </div>

            <div className="game-card white">
              <div className="card-text">Projects Completed: {profile.summary?.totalProjectsCompleted ?? 0}</div>
            </div>

            <div className="game-card white">
              <div className="card-text">Achievements</div>
            </div>

            <div className="game-card dark">
              <div className="card-text">Settings</div>
            </div>
          </div>

          <div className="right-col">
            <div className="game-card red-pill">
              <div className="card-text big">Level: {profile.summary?.level ?? 0}</div>
            </div>

            <div className="game-card white">
              <div className="card-text">Average Grade: {profile.summary?.averageGrade ?? 'N/A'}</div>
            </div>

            <div className="game-card white">
              <div className="card-text">Achievements: {(profile.summary?.achievements?.length) ?? 0}</div>
            </div>

            <div className="game-card white">
              <div className="card-text">Language: {language === 'en' ? 'English' : 'Français'}</div>
              <div className="language-actions">
                <button className={`lang-btn ${language==='en' ? 'active' : ''}`} onClick={() => handleLanguageChange('en')} disabled={saving}>EN</button>
                <button className={`lang-btn ${language==='fr' ? 'active' : ''}`} onClick={() => handleLanguageChange('fr')} disabled={saving}>FR</button>
              </div>
            </div>
          </div>
        </main>

        <section className="achievements-section">
          {renderAchievements(profile.summary?.achievements)}
        </section>

        {saveMessage && <div className="save-message">{saveMessage}</div>}
      </div>
    </div>
  );
}

export default Profile;