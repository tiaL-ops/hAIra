import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls } from '@react-three/drei';

// Creative step component with orbiting particles
function Step3D({ position, color, number, delay = 0 }) {
  const meshRef = useRef();
  const orbitRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime + delay;
      // Gentle rotation
      meshRef.current.rotation.y = time * 0.3;
      // Subtle breathing
      const breath = 1 + Math.sin(time * 2) * 0.15;
      meshRef.current.scale.setScalar(breath);
      // Floating motion
      meshRef.current.position.y = position[1] + Math.sin(time * 1.5 + delay) * 0.15;
    }
    
    // Animate orbiting particles
    if (orbitRef.current) {
      const time = state.clock.elapsedTime + delay;
      orbitRef.current.children.forEach((particle, i) => {
        const angle = (i / 6) * Math.PI * 2 + time * 2;
        const radius = 1.2;
        const height = Math.sin(time * 3 + i) * 0.2;
        
        particle.position.x = Math.cos(angle) * radius;
        particle.position.y = height;
        particle.position.z = Math.sin(angle) * radius;
        
        // Particle twinkle
        const twinkle = 0.08 + Math.sin(time * 6 + i) * 0.04;
        particle.scale.setScalar(twinkle);
      });
    }
  });

  return (
    <group position={position}>
      {/* Main step sphere */}
      <Sphere ref={meshRef} args={[0.7, 16, 16]}>
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.9}
          roughness={0.2}
          metalness={0.8}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </Sphere>
      
      {/* Orbiting particles */}
      <group ref={orbitRef}>
        {[...Array(6)].map((_, i) => (
          <Sphere key={i} args={[0.04, 8, 8]}>
            <meshBasicMaterial 
              color="#ffffff" 
              transparent={true}
              opacity={0.7}
            />
          </Sphere>
        ))}
      </group>
    </group>
  );
}

// Connecting flow particle between steps
function FlowParticle({ start, end, delay = 0 }) {
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
      meshRef.current.position.y += Math.sin(time * 4 + progress * Math.PI * 2) * 0.2;
      
      // Pulse
      const pulse = 0.05 + Math.sin(time * 8) * 0.03;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <Sphere ref={meshRef} args={[0.03, 6, 6]}>
      <meshBasicMaterial 
        color="#ffffff" 
        transparent={true}
        opacity={0.8}
      />
    </Sphere>
  );
}

// Creative steps scene with journey flow
function StepsScene() {
  const stepPositions = [
    [-3, 0, 0],
    [-1, 0, 0],
    [1, 0, 0],
    [3, 0, 0]
  ];
  
  const stepColors = ['#ff6b6b', '#4a90e2', '#22cc88', '#ffd700'];
  
  // Define flow paths between steps
  const flowPaths = [
    { start: stepPositions[0], end: stepPositions[1] },
    { start: stepPositions[1], end: stepPositions[2] },
    { start: stepPositions[2], end: stepPositions[3] },
  ];
  
  return (
    <group>
      {/* Dynamic lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[-3, 2, 3]} intensity={0.8} color="#ff6b6b" />
      <pointLight position={[-1, 2, 3]} intensity={0.8} color="#4a90e2" />
      <pointLight position={[1, 2, 3]} intensity={0.8} color="#22cc88" />
      <pointLight position={[3, 2, 3]} intensity={0.8} color="#ffd700" />
      
      {/* Step spheres */}
      {stepPositions.map((pos, index) => (
        <Step3D 
          key={index}
          position={pos} 
          color={stepColors[index]} 
          number={index + 1} 
          delay={index * 0.5} 
        />
      ))}
      
      {/* Flowing particles between steps showing the journey */}
      {flowPaths.map((path, index) => (
        <React.Fragment key={`flow-${index}`}>
          {[...Array(4)].map((_, i) => (
            <FlowParticle
              key={`${index}-${i}`}
              start={path.start}
              end={path.end}
              delay={index * 0.8 + i * 0.2}
            />
          ))}
        </React.Fragment>
      ))}
    </group>
  );
}

export default function Steps3D() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return (
      <div style={{ 
        width: '100%', 
        height: '300px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#22cc88',
        fontSize: '1.2rem'
      }}>
        Loading Steps...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <Canvas 
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <StepsScene />
        <OrbitControls enableZoom={true} enablePan={false} />
      </Canvas>
    </div>
  );
}
