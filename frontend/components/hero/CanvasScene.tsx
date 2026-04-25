'use client'

import { Canvas } from '@react-three/fiber'
import {
  OrbitControls,
  Environment,
  ContactShadows,
  useGLTF,
  Stage
} from '@react-three/drei'
import { Suspense } from 'react'

const MODEL_PATH = '/sneaker.glb'

function Model() {
  const { scene } = useGLTF(MODEL_PATH)
  return <primitive object={scene} />
}

interface CanvasSceneProps {
  onReady: () => void
}

export default function CanvasScene({ onReady }: CanvasSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows
      // Pulled camera back a bit more (6.0) to give text more breathing room
      camera={{ position: [0, 0, 6.0], fov: 40 }}
      onCreated={() => onReady()}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#060606']} />

      <Suspense fallback={null}>
        <Stage 
          environment="city" 
          intensity={0.4} 
          shadows={true}
          adjustCamera={true}
          // Shifted down a bit more to clear the main headline
          position={[0, -0.4, 0]}
        >
          <Model />
        </Stage>
      </Suspense>

      <OrbitControls
        autoRotate
        // Increased rotation speed from 0.4 to 1.8 as requested
        autoRotateSpeed={1.8}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2.5}
        maxPolarAngle={Math.PI / 1.8}
      />
    </Canvas>
  )
}
