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
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  
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
        setAvatarUrl(response.data.user?.avatarUrl || null);
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

  // Compress image to be under 2MB
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions to keep aspect ratio
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Start with quality 0.9 and reduce if needed
          let quality = 0.9;
          let imageData = canvas.toDataURL('image/jpeg', quality);
          
          // Keep reducing quality until under 2MB
          while (imageData.length > 2 * 1024 * 1024 && quality > 0.1) {
            quality -= 0.1;
            imageData = canvas.toDataURL('image/jpeg', quality);
          }
          
          resolve(imageData);
        };
        
        img.onerror = reject;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !auth.currentUser) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSaveMessage('Please select a valid image file');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    try {
      setUploading(true);
      setSaveMessage('Uploading image...');

      // Compress the image
      const compressedImage = await compressImage(file);

      // Upload to backend
      const token = await auth.currentUser.getIdToken();
      const response = await axios.patch(
        "http://localhost:3002/api/profile/avatar",
        { avatarData: compressedImage },
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      setAvatarUrl(compressedImage);
      setSaveMessage('Profile picture updated successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error("Error uploading avatar:", err);
      setSaveMessage('Failed to upload profile picture');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setUploading(false);
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
          <div className="avatar-circle" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
            <input 
              type="file" 
              id="avatar-upload" 
              accept="image/*" 
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
            <label htmlFor="avatar-upload" className="avatar-label">
              {uploading ? 'Uploading...' : (avatarUrl ? 'Change Picture' : '+ Add Picture')}
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