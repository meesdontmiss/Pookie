'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import { AVAILABLE_SKINS, SkinDef, getSelectedSkinId, setSelectedSkinId } from '@/shared/skins';

interface SkinPreviewProps {
  skin: SkinDef;
}

const SkinPreview3D: React.FC<SkinPreviewProps> = ({ skin }) => {
  const { scene } = useGLTF(skin.modelPath);
  const cloned = scene.clone();
  return (
    <primitive object={cloned} scale={skin.scale * 4} position={[0, skin.offsetY * 2, 0]} />
  );
};

interface SkinPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect?: (skinId: string) => void;
}

const SkinPicker: React.FC<SkinPickerProps> = ({ open, onClose, onSelect }) => {
  const [selectedId, setSelectedId] = useState(getSelectedSkinId());
  const [previewSkin, setPreviewSkin] = useState<SkinDef>(
    AVAILABLE_SKINS.find((s) => s.id === selectedId) || AVAILABLE_SKINS[0]
  );

  useEffect(() => {
    setSelectedId(getSelectedSkinId());
  }, [open]);

  const handleSelect = (skin: SkinDef) => {
    setSelectedId(skin.id);
    setPreviewSkin(skin);
    setSelectedSkinId(skin.id);
    onSelect?.(skin.id);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, rgba(15,20,40,0.95), rgba(10,15,30,0.98))',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: 28,
          width: '90vw',
          maxWidth: 560,
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            background: 'linear-gradient(90deg, #00ff88, #0af0ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Choose Your Skin
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#aaa',
              borderRadius: 8,
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>

        {/* 3D Preview */}
        <div style={{
          width: '100%',
          height: 180,
          borderRadius: 14,
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 20,
        }}>
          <Canvas camera={{ position: [0, 0.5, 2.5], fov: 45 }} dpr={[1, 1.5]}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[2, 3, 2]} intensity={1} />
            <Suspense fallback={null}>
              <SkinPreview3D skin={previewSkin} />
              <Environment files="/HDRI/passendorf_snow_1k.hdr" />
            </Suspense>
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={3}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 2}
            />
          </Canvas>
        </div>

        {/* Skin Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}>
          {AVAILABLE_SKINS.map((skin) => (
            <button
              key={skin.id}
              onClick={() => handleSelect(skin)}
              style={{
                padding: '14px 8px',
                borderRadius: 12,
                border: selectedId === skin.id
                  ? '2px solid #00ff88'
                  : '1px solid rgba(255,255,255,0.1)',
                background: selectedId === skin.id
                  ? 'rgba(0,255,136,0.12)'
                  : 'rgba(255,255,255,0.04)',
                color: selectedId === skin.id ? '#00ff88' : '#ccc',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: selectedId === skin.id ? 700 : 500,
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              {skin.name}
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#555' }}>
          Selected: <strong style={{ color: '#00ff88' }}>{previewSkin.name}</strong>
        </div>
      </div>
    </div>
  );
};

export default SkinPicker;
