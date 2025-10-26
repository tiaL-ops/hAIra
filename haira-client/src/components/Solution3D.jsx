import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls } from '@react-three/drei';

// Simple 3D human component
function Human3D() {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      // Gentle rotation
      meshRef.current.rotation.y = time * 0.2;
      // Subtle breathing
      const breath = 1 + Math.sin(time * 1.5) * 0.1;
      meshRef.current.scale.setScalar(breath);
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 32, 32]}>
      <meshStandardMaterial 
        color="#4a90e2" 
        transparent 
        opacity={0.8}
        roughness={0.3}
        metalness={0.1}
      />
    </Sphere>
  );
}

// Simple 3D plus icon
function Plus3D() {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      // Gentle floating motion
      meshRef.current.position.y = Math.sin(time * 2.5) * 0.1;
    }
  });

  return (
    <Sphere ref={meshRef} args={[0.2, 8, 8]}>
      <meshBasicMaterial color="#ffffff" />
    </Sphere>
  );
}

// Simple 3D AI team component
function AITeam3D() {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      // Faster rotation
      meshRef.current.rotation.y = time * 0.6;
      // Pulsing effect
      const pulse = 1 + Math.sin(time * 2.5) * 0.15;
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

// Simple 3D equals icon
function Equals3D() {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      // Gentle floating motion
      meshRef.current.position.y = Math.sin(time * 2.5) * 0.1;
    }
  });

  return (
    <Sphere ref={meshRef} args={[0.2, 8, 8]}>
      <meshBasicMaterial color="#ffffff" />
    </Sphere>
  );
}

// Simple 3D success component
function Success3D() {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      // Gentle rotation
      meshRef.current.rotation.y = time * 0.4;
      // Success pulsing
      const pulse = 1 + Math.sin(time * 4) * 0.2;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 32, 32]}>
      <meshStandardMaterial 
        color="#ffd700" 
        transparent 
        opacity={0.9}
        roughness={0.1}
        metalness={0.9}
        emissive="#ffd700"
        emissiveIntensity={0.3}
      />
    </Sphere>
  );
}

// Simple 3D scene for solution section
function SolutionScene() {
  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 5]} intensity={1} />
      
      {/* Human (left) */}
      <group position={[-3, 0, 0]}>
        <Human3D />
      </group>
      
      {/* Plus (left-middle) */}
      <group position={[-1.5, 0, 0]}>
        <Plus3D />
      </group>
      
      {/* AI Team (middle) */}
      <group position={[0, 0, 0]}>
        <AITeam3D />
      </group>
      
      {/* Equals (right-middle) */}
      <group position={[1.5, 0, 0]}>
        <Equals3D />
      </group>
      
      {/* Success (right) */}
      <group position={[3, 0, 0]}>
        <Success3D />
      </group>
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
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <SolutionScene />
        <OrbitControls enableZoom={true} enablePan={false} />
      </Canvas>
    </div>
  );
}
