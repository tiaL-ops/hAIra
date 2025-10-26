// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [wordCloudWords] = useState([
    'As an AI language model...',
    'I do not have personal opinions, beliefs, or feelings.',
    'It is important to note that...',
    'Based on the information provided...',
    'Cutting-edge',
    'Revolutionize',
    'It\'s not just [X], it\'s [Y]',
    'It \'s real, It \'s powerful',
    'Seamlessly integrated',
    'Harnessing the power of..',
    'A testament to...',
    'Unlock the potential of...',
    'Dear [include the name]',
    'I feel you...',
    '..their eyes widened in realization'
  ]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <main className="home-container">
      {/* AI Word Cloud Section - Now at the top */}
      <section className="word-cloud-section">
        <div className="word-cloud-container">
          <div className="word-cloud">
            {wordCloudWords.map((word, index) => (
              <span 
                key={index} 
                className={`word-cloud-item word-${index + 1}`}
                style={{
                  animationDelay: `${index * 0.1}s`,
                  '--random-x': Math.random() * 100 + '%',
                  '--random-y': Math.random() * 100 + '%'
                }}
              >
                {word}
              </span>
            ))}
            {/* Centered headline in the middle of the word cloud */}
            <div className="word-cloud-center">
              <h1 className="center-headline">AI isn't perfect, we all know it.</h1>
              <p className="center-subtitle">We built hAIra to help you keep what AI can't replace: your critical thinking.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="home-hero">
        <div className="hero-inner">
          <div className={`eyebrow ${isVisible ? 'animate-in' : ''}`}>
            <span className="eyebrow-text">hAIra</span>
            <div className="eyebrow-glow"></div>
          </div>
          
          <p className={`hero-sub ${isVisible ? 'animate-in' : ''}`}>
            We built hAIra to help you keep what AI can't replace: your <span className="highlight-text">critical thinking</span>.
            <br />
            So pause and reflect. hAIra is an educational platform where you learn to lead,
            critique, and collaborate by working with <strong className="accent-text">AI as your teammate.</strong>
          </p>

          <div className={`hero-ctas ${isVisible ? 'animate-in' : ''}`}>
            <Link to="/projects" className="btn btn-primary">
              <span className="btn-text">Start Your First Project</span>
              <div className="btn-glow"></div>
            </Link>
            <Link to="/login" className="btn btn-secondary">
              <span className="btn-text">Try the hAIra Demo</span>
            </Link>
          </div>

          <p className={`hero-slogan ${isVisible ? 'animate-in' : ''}`}>
            With hAIra, we aim to help humans <span className="slogan-highlight">think better, not less.</span>
          </p>

          {/* Enhanced floating elements */}
          <div className="floating-elements">
            <div className="floating-orb teal-orb"></div>
            <div className="floating-orb purple-orb"></div>
            <div className="floating-orb red-orb"></div>
            <div className="floating-orb green-orb"></div>
            <div className="floating-particles">
              {[...Array(12)].map((_, i) => (
                <div key={i} className={`particle particle-${i + 1}`}></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="home-section problem-section">
        <div className="section-card problem-card">
          <div className="section-icon">⚠️</div>
          <h2 className="section-title">The Problem</h2>
          <p className="section-text">
            Did you know that over-relying on Generative AI can diminish critical thinking?
            <br /><br />
            Research shows that when students passively accept AI-generated answers, it can
            negatively impact their analytical and decision-making skills.
          </p>
          <div className="problem-stats">
            <div className="stat-item">
              <span className="stat-number">73%</span>
              <span className="stat-label">of students rely heavily on AI</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">45%</span>
              <span className="stat-label">decrease in critical thinking</span>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="home-section solution-section">
        <div className="section-card solution-card">
          <div className="section-icon">🤝</div>
          <h2 className="section-title">Our Solution: Human – AI Teaming</h2>
          <p className="section-text">
            hAIra simulates short-term, industry-style projects where you lead, design,
            and collaborate with AI partners to get the job done. You lead, critique, and work.
          </p>
          <div className="solution-features">
            <div className="feature-item">
              <div className="feature-icon">🎯</div>
              <div className="feature-content">
                <h3>Critique AI-generated content</h3>
                <p>and decide what to use</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">👥</div>
              <div className="feature-content">
                <h3>Collaborate with diverse "personalities"</h3>
                <p>including AI teammates who are helpful and some who are constructively challenging</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📝</div>
              <div className="feature-content">
                <h3>Practice teamwork</h3>
                <p>by managing tasks, communicating in a group chat, and co-authoring documents</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="home-section steps-section">
        <div className="section-card steps-card">
          <div className="section-icon">🚀</div>
          <h2 className="section-title">Get Started in 4 Steps</h2>
          <div className="steps-container">
            <div className="steps-grid">
              <div className="step-card step-1">
                <div className="step-badge">1</div>
                <div className="step-icon">📋</div>
                <h3>Choose Your Project</h3>
                <p>
                  Pick from a list of topics or have the AI generate a new, realistic project brief
                  for a total of 7 days.
                </p>
                <div className="step-arrow">→</div>
              </div>
              <div className="step-card step-2">
                <div className="step-badge">2</div>
                <div className="step-icon">👥</div>
                <h3>Meet Your AI Team</h3>
                <p>
                  Choose your teammate. Use the group chat and task board to plan your attack.
                </p>
                <div className="step-arrow">→</div>
              </div>
              <div className="step-card step-3">
                <div className="step-badge">3</div>
                <div className="step-icon">✍️</div>
                <h3>Collaborate and Co-Create</h3>
                <p>
                  Work together in the built-in text editor. Ask your AI teammates to draft sections, review
                  your work, or give you feedback—just like real colleagues.
                </p>
                <div className="step-arrow">→</div>
              </div>
              <div className="step-card step-4">
                <div className="step-badge">4</div>
                <div className="step-icon">📊</div>
                <h3>Submit & Get Feedback</h3>
                <p>
                  Submit your final project to the AI Project Manager for a detailed grade on report quality,
                  teamwork, and contribution balance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fun Fact */}
      <section className="home-section funfact-section">
        <div className="section-card funfact-card">
          <div className="funfact-content">
            <div className="funfact-icon">✨</div>
            <h2 className="section-title">Cool fun fact</h2>
            <p className="section-text">
              The name <strong className="brand-highlight">hAIra</strong> is inspired by the Malagasy word 
              <em className="italic-highlight"> "hairaha"</em>, which means 
              <span className="meaning-highlight"> "the ability to create and critique art."</span>
            </p>
            <div className="funfact-decoration">
              <div className="decoration-line"></div>
              <div className="decoration-dot"></div>
              <div className="decoration-line"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="home-cta">
        <div className="cta-inner">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Lead Your First AI Team?</h2>
            <p className="cta-subtitle">Join thousands of students already collaborating with AI</p>
            <div className="cta-actions">
              <Link to="/projects" className="btn btn-primary cta-primary">
                <span className="btn-text">Start Your First Project</span>
                <div className="btn-glow"></div>
              </Link>
              <Link to="/login" className="btn btn-ghost cta-secondary">
                <span className="btn-text">Try the hAIra Demo</span>
              </Link>
            </div>
          </div>
          <div className="cta-visual">
            <div className="cta-particles">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`cta-particle cta-particle-${i + 1}`}></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;