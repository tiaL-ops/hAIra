import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls } from '@react-three/drei';

// Simple 3D brain component
function Brain3D() {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      // Gentle rotation
      meshRef.current.rotation.y = time * 0.3;
      // Subtle breathing
      const breath = 1 + Math.sin(time * 2) * 0.1;
      meshRef.current.scale.setScalar(breath);
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 32, 32]}>
      <meshStandardMaterial 
        color="#ff6b6b" 
        transparent 
        opacity={0.8}
        roughness={0.3}
        metalness={0.1}
      />
    </Sphere>
  );
}

// Simple 3D AI component
function AI3D() {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      // Faster rotation
      meshRef.current.rotation.y = time * 0.8;
      // Pulsing effect
      const pulse = 1 + Math.sin(time * 3) * 0.2;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <Sphere ref={meshRef} args={[0.8, 16, 16]}>
      <meshStandardMaterial 
        color="#22cc88" 
        transparent 
        opacity={0.9}
        roughness={0.2}
        metalness={0.8}
        emissive="#22cc88"
        emissiveIntensity={0.2}
      />
    </Sphere>
  );
}

// Simple 3D arrow component
function Arrow3D() {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      // Gentle floating motion
      meshRef.current.position.y = Math.sin(time * 2) * 0.1;
    }
  });

  return (
    <Sphere ref={meshRef} args={[0.3, 8, 8]}>
      <meshBasicMaterial color="#ffffff" />
    </Sphere>
  );
}

// Simple 3D scene for problem section
function ProblemScene() {
  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 5]} intensity={1} />
      
      {/* Brain (left) */}
      <group position={[-2, 0, 0]}>
        <Brain3D />
      </group>
      
      {/* Arrow (middle) */}
      <group position={[0, 0, 0]}>
        <Arrow3D />
      </group>
      
      {/* AI (right) */}
      <group position={[2, 0, 0]}>
        <AI3D />
      </group>
    </group>
  );
}

export default function ProblemNeuralNetwork() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return (
      <div style={{ 
        width: '100%', 
        height: '600px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#22cc88',
        fontSize: '1.2rem'
      }}>
        Loading Neural Network...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <Canvas 
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <ProblemScene />
        <OrbitControls enableZoom={true} enablePan={false} />
      </Canvas>
    </div>
  );
}