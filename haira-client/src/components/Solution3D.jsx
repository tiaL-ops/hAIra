import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls } from '@react-three/drei';

// Human brain component
function HumanBrain({ position }) {
  const brainRef = useRef();
  
  useFrame((state) => {
    if (brainRef.current) {
      const time = state.clock.elapsedTime;
      // Human thinking - slower, more deliberate
      brainRef.current.rotation.y = time * 0.3;
      const breath = 1 + Math.sin(time * 1.5) * 0.1;
      brainRef.current.scale.setScalar(breath);
    }
  });

  return (
    <group position={position}>
      <Sphere ref={brainRef} args={[1, 32, 32]}>
        <meshStandardMaterial 
          color="#4a90e2" 
          transparent 
          opacity={0.9}
          roughness={0.3}
          metalness={0.2}
          emissive="#4a90e2"
          emissiveIntensity={0.3}
        />
      </Sphere>
    </group>
  );
}

// AI brain component
function AIBrain({ position }) {
  const brainRef = useRef();
  
  useFrame((state) => {
    if (brainRef.current) {
      const time = state.clock.elapsedTime;
      // AI processing - faster
      brainRef.current.rotation.y = time * 0.6;
      const pulse = 1 + Math.sin(time * 3) * 0.15;
      brainRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position}>
      <Sphere ref={brainRef} args={[1, 32, 32]}>
        <meshStandardMaterial 
          color="#22cc88" 
          transparent 
          opacity={0.9}
          roughness={0.2}
          metalness={0.8}
          emissive="#22cc88"
          emissiveIntensity={0.4}
        />
      </Sphere>
    </group>
  );
}

// Collaboration particle flowing between brains
function CollaborationParticle({ start, end, delay = 0, color = '#ffffff' }) {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime + delay;
      const progress = (time * 0.5) % 1;
      
      // Interpolate between start and end
      const x = start[0] + (end[0] - start[0]) * progress;
      const y = start[1] + (end[1] - start[1]) * progress;
      const z = start[2] + (end[2] - start[2]) * progress;
      
      meshRef.current.position.set(x, y, z);
      
      // Add wave motion
      meshRef.current.position.y += Math.sin(time * 4 + progress * Math.PI * 2) * 0.3;
      
      // Twinkle
      const twinkle = 0.08 + Math.sin(time * 8) * 0.04;
      meshRef.current.scale.setScalar(twinkle);
    }
  });

  return (
    <Sphere ref={meshRef} args={[0.04, 8, 8]}>
      <meshBasicMaterial 
        color={color} 
        transparent={true}
        opacity={0.9}
      />
    </Sphere>
  );
}

// Idea sparkle orbiting around the collaboration
function IdeaSparkle({ radius, speed, delay, color }) {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime * speed + delay;
      const angle = time;
      
      meshRef.current.position.x = Math.cos(angle) * radius;
      meshRef.current.position.y = Math.sin(time * 2) * 0.5;
      meshRef.current.position.z = Math.sin(angle) * radius;
      
      // Sparkle effect
      const sparkle = 0.1 + Math.sin(time * 6) * 0.05;
      meshRef.current.scale.setScalar(sparkle);
    }
  });

  return (
    <Sphere ref={meshRef} args={[0.06, 8, 8]}>
      <meshBasicMaterial 
        color={color} 
        transparent={true}
        opacity={0.8}
      />
    </Sphere>
  );
}

// Main solution scene showing Human-AI teaming
function SolutionScene() {
  const humanPos = [-2, 0, 0];
  const aiPos = [2, 0, 0];
  
  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[-2, 2, 3]} intensity={1} color="#4a90e2" />
      <pointLight position={[2, 2, 3]} intensity={1} color="#22cc88" />
      
      {/* Human Brain (left) */}
      <HumanBrain position={humanPos} />
      
      {/* AI Brain (right) */}
      <AIBrain position={aiPos} />
      
      {/* Collaboration particles flowing both ways */}
      {/* Human to AI */}
      {[...Array(8)].map((_, i) => (
        <CollaborationParticle
          key={`h2a-${i}`}
          start={humanPos}
          end={aiPos}
          delay={i * 0.5}
          color="#4a90e2"
        />
      ))}
      
      {/* AI to Human */}
      {[...Array(8)].map((_, i) => (
        <CollaborationParticle
          key={`a2h-${i}`}
          start={aiPos}
          end={humanPos}
          delay={i * 0.5 + 0.25}
          color="#22cc88"
        />
      ))}
      
      {/* Idea sparkles orbiting around the center */}
      {[...Array(12)].map((_, i) => (
        <IdeaSparkle
          key={`idea-${i}`}
          radius={3 + (i % 3) * 0.5}
          speed={1 + (i % 3) * 0.2}
          delay={i * 0.5}
          color={i % 2 === 0 ? '#ffd700' : '#ffffff'}
        />
      ))}
    </group>
  );
}

export default function Solution3D() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return (
      <div style={{ 
        width: '100%', 
        height: '400px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#22cc88',
        fontSize: '1.2rem'
      }}>
        Loading Solution...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas 
        camera={{ position: [0, 0, 10], fov: 60 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <SolutionScene />
        <OrbitControls enableZoom={true} enablePan={false} />
      </Canvas>
    </div>
  );
}
