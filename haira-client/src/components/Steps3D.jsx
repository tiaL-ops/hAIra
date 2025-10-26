import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls } from '@react-three/drei';

// Simple 3D step component
function Step3D({ position, color, number, delay = 0 }) {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime + delay;
      // Gentle rotation
      meshRef.current.rotation.y = time * 0.3;
      // Subtle breathing
      const breath = 1 + Math.sin(time * 2) * 0.1;
      meshRef.current.scale.setScalar(breath);
      // Floating motion
      meshRef.current.position.y = position[1] + Math.sin(time * 1.5 + delay) * 0.1;
    }
  });

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[0.6, 16, 16]}>
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.8}
          roughness={0.3}
          metalness={0.7}
          emissive={color}
          emissiveIntensity={0.1}
        />
      </Sphere>
      {/* Step number indicator */}
      <Sphere position={[0, 0, 0.7]} args={[0.2, 8, 8]}>
        <meshBasicMaterial color="#ffffff" />
      </Sphere>
    </group>
  );
}

// Simple 3D scene for steps section
function StepsScene() {
  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 5]} intensity={1} />
      
      {/* Step 1 - Choose Project */}
      <Step3D 
        position={[-3, 0, 0]} 
        color="#ff6b6b" 
        number={1} 
        delay={0} 
      />
      
      {/* Step 2 - Meet Team */}
      <Step3D 
        position={[-1, 0, 0]} 
        color="#4a90e2" 
        number={2} 
        delay={0.5} 
      />
      
      {/* Step 3 - Collaborate */}
      <Step3D 
        position={[1, 0, 0]} 
        color="#22cc88" 
        number={3} 
        delay={1} 
      />
      
      {/* Step 4 - Submit */}
      <Step3D 
        position={[3, 0, 0]} 
        color="#ffd700" 
        number={4} 
        delay={1.5} 
      />
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
