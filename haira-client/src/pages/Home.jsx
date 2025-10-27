// src/pages/Home.jsx
import React, { useState, useEffect, Suspense } from 'react';
import { Link } from 'react-router-dom';

import '../styles/Home.css';

function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [wordCloudWords] = useState([
    'why do i feel pain?',
    'chat does he love me?',
    'Can u summarize this like i\'m a 5 year old?',
    'NO I DIDNT MEAN THAT',
    'Draft a professional email',
    'build this website for me',
    'It\'s not just [X], it\'s [Y]',
    'It \'s real, It \'s powerful',
    'am i going crazy?',
    'Gemini generate image',
    'FIX THE BUG I SAID!',
    'make this look cute',
    'Dear [include the name]',
    'Make this sounds smarter',
    'dnfajknfj, fix this',
    'shoul i say yes or no?',
    'how do i become rich'
  
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
              <h2> So pause and reflect.</h2>
             
            
          
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
           hAIra is an educational platform where you learn to lead,
            critique, and collaborate by working with <strong className="accent-text">AI as your teammate.</strong>
          </p>

          <div className={`hero-ctas ${isVisible ? 'animate-in' : ''}`}>
          <p className={`hero-slogan ${isVisible ? 'animate-in' : ''}`}>
            We aim to help humans <span className="slogan-highlight">think better, not less.</span>
          </p>
            <Link to="/login" className="btn btn-secondary">
              <span className="btn-text">Try the hAIra Demo</span>
            </Link>
          </div>

          
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
        <div className="problem-content">
          <div className="problem-visual">
       
            <div className="problem-graphic">
              <div className="brain-icon">🧠</div>
              <div className="arrow-down">↓</div>
              <div className="ai-icon">🤖</div>
            </div>
          </div>
          <div className="problem-text">
            <h2 className="section-title">The Problem</h2>
            <p className="section-text">
              Did you know that over-relying on Generative AI can diminish critical thinking?
            </p>
            <p className="section-text">
              Research shows that when students passively accept AI-generated answers, it can
              negatively impact their analytical and decision-making skills.
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="home-section solution-section">
        <div className="solution-content">
          <div className="solution-text">
            <h2 className="section-title">Our Solution: Human – AI Teaming</h2>
            <p className="section-text">
              hAIra simulates short-term, industry-style projects where you lead, design,
              and collaborate with AI partners to get the job done. You lead, critique, and work.
            </p>
            <p className="section-text">
              You will learn to:
            </p>
            <ul className="bullet-list">
              <li><strong>Critique AI-generated content</strong> and decide what to use.</li>
              <li><strong>Collaborate with diverse "personalities,"</strong> including AI teammates who are helpful and some who are constructively challenging.</li>
              <li><strong>Practice teamwork</strong> by managing tasks, communicating in a group chat, and co-authoring documents.</li>
            </ul>
          </div>
          <div className="solution-visual">
        
            <div className="solution-graphic">
              <div className="human-icon">👤</div>
              <div className="plus-icon">+</div>
              <div className="ai-team-icon">🤖</div>
              <div className="equals-icon">=</div>
              <div className="success-icon">✨</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="home-section steps-section">
        <h2 className="section-title">Get Started in 4 Steps</h2>
        <div className="steps-container">
          <div className="step-item">
            <div className="step-visual">
              <div className="step-number">1</div>
            
            </div>
            <div className="step-content">
              <h3>Choose Your Project</h3>
              <p>Pick from a list of topics or have the AI generate a new, realistic project brief for a total of 7 days.</p>
            </div>
          </div>
          <div className="step-item">
            <div className="step-visual">
              <div className="step-number">2</div>
             
            </div>
            <div className="step-content">
              <h3>Meet Your AI Team</h3>
              <p>Choose your teammate. Use the group chat and task board to plan your attack.</p>
            </div>
          </div>
          <div className="step-item">
            <div className="step-visual">
              <div className="step-number">3</div>
              
            </div>
            <div className="step-content">
              <h3>Collaborate and Co-Create</h3>
              <p>Work together in the built-in text editor. Ask your AI teammates to draft sections, review your work, or give you feedback—just like real colleagues.</p>
            </div>
          </div>
          <div className="step-item">
            <div className="step-visual">
              <div className="step-number">4</div>
      
            </div>
            <div className="step-content">
              <h3>Submit & Get Feedback</h3>
              <p>Submit your final project to the AI Project Manager for a detailed grade on report quality, teamwork, and contribution balance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fun Fact */}
      <section className="home-section funfact-section">
        <h2 className="section-title">Cool fun fact ☺️</h2>
        <p className="section-text">
          The name <strong>hAIra</strong> is inspired by the Malagasy word 
          <em> "hairaha"</em>, which means 
          "the ability to create and critique art."
        </p>
      </section>

      {/* Final CTA */}
      <section className="home-cta">
        <h2 className="cta-title">Ready?</h2>
        <div className="cta-actions">
          <Link to="/projects" className="btn btn-primary">
            <span className="btn-text">Start Your First Project</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Home;