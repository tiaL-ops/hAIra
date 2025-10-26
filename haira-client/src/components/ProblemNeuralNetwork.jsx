import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls } from '@react-three/drei';

// Simple neural node component
function NeuralNode({ position, color, size = 0.3, isActive = false }) {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      
      if (isActive) {
        // Active nodes pulse
        const pulse = 1 + Math.sin(time * 4) * 0.3;
        meshRef.current.scale.setScalar(pulse);
      } else {
        // Inactive nodes have subtle breathing
        const breath = 1 + Math.sin(time * 2) * 0.1;
        meshRef.current.scale.setScalar(breath);
      }
      
      // Gentle rotation
      meshRef.current.rotation.y = time * 0.5;
    }
  });

  return (
    <Sphere ref={meshRef} position={position} args={[size, 16, 16]}>
      <meshStandardMaterial 
        color={color} 
        transparent 
        opacity={isActive ? 0.9 : 0.7}
        emissive={isActive ? color : '#000000'}
        emissiveIntensity={isActive ? 0.3 : 0.1}
        roughness={0.3}
        metalness={0.7}
      />
    </Sphere>
  );
}

// Simple connection line
function Connection({ start, end, isActive = false }) {
  const lineRef = useRef();
  
  useFrame((state) => {
    if (lineRef.current && isActive) {
      const time = state.clock.elapsedTime;
      const opacity = 0.3 + Math.sin(time * 4) * 0.2;
      if (lineRef.current.material) {
        lineRef.current.material.opacity = opacity;
      }
    }
  });

  const points = [
    [start[0], start[1], start[2]],
    [end[0], end[1], end[2]]
  ];

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flat())}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial 
        color={isActive ? '#ff6b6b' : '#666666'} 
        transparent 
        opacity={isActive ? 0.8 : 0.3}
      />
    </line>
  );
}

// Simple neural network scene
function NeuralNetworkScene() {
  const [activeNodes, setActiveNodes] = useState(new Set());
  
  // Define simple 3-layer network
  const nodes = [
    // Input layer (left)
    { id: 0, position: [-3, 1, 0], color: '#22cc88', layer: 0 },
    { id: 1, position: [-3, 0, 0], color: '#22cc88', layer: 0 },
    { id: 2, position: [-3, -1, 0], color: '#22cc88', layer: 0 },
    
    // Hidden layer (middle)
    { id: 3, position: [0, 1.5, 0], color: '#9169C0', layer: 1 },
    { id: 4, position: [0, 0.5, 0], color: '#9169C0', layer: 1 },
    { id: 5, position: [0, -0.5, 0], color: '#9169C0', layer: 1 },
    { id: 6, position: [0, -1.5, 0], color: '#9169C0', layer: 1 },
    
    // Output layer (right)
    { id: 7, position: [3, 0.5, 0], color: '#ff6b6b', layer: 2 },
    { id: 8, position: [3, -0.5, 0], color: '#ff6b6b', layer: 2 },
  ];
  
  // Define connections
  const connections = [
    // Input to Hidden
    { start: nodes[0].position, end: nodes[3].position },
    { start: nodes[0].position, end: nodes[4].position },
    { start: nodes[1].position, end: nodes[4].position },
    { start: nodes[1].position, end: nodes[5].position },
    { start: nodes[2].position, end: nodes[5].position },
    { start: nodes[2].position, end: nodes[6].position },
    
    // Hidden to Output
    { start: nodes[3].position, end: nodes[7].position },
    { start: nodes[4].position, end: nodes[7].position },
    { start: nodes[4].position, end: nodes[8].position },
    { start: nodes[5].position, end: nodes[8].position },
    { start: nodes[6].position, end: nodes[8].position },
  ];

  // Animate active nodes
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const newActiveNodes = new Set();
    
    // Simulate data flow - activate nodes in sequence
    const cycleTime = 3; // 3 seconds per cycle
    const phase = (time % cycleTime) / cycleTime;
    
    if (phase < 0.3) {
      // Input layer active
      nodes.filter(n => n.layer === 0).forEach(n => newActiveNodes.add(n.id));
    } else if (phase < 0.6) {
      // Hidden layer active
      nodes.filter(n => n.layer === 1).forEach(n => newActiveNodes.add(n.id));
    } else {
      // Output layer active
      nodes.filter(n => n.layer === 2).forEach(n => newActiveNodes.add(n.id));
    }
    
    setActiveNodes(newActiveNodes);
  });

  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 5]} intensity={1} />
      
      {/* Neural Nodes */}
      {nodes.map((node) => (
        <NeuralNode
          key={node.id}
          position={node.position}
          color={node.color}
          isActive={activeNodes.has(node.id)}
        />
      ))}
      
      {/* Connections */}
      {connections.map((conn, index) => (
        <Connection
          key={index}
          start={conn.start}
          end={conn.end}
          isActive={activeNodes.size > 0}
        />
      ))}
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
        <NeuralNetworkScene />
        <OrbitControls enableZoom={true} enablePan={false} />
      </Canvas>
    </div>
  );
}