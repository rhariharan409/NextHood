'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ImageEditorProps {
  onSave: (versions: { high: string; medium: string; thumbnail: string }) => void;
  onRemove: () => void;
  initialImageUrl?: string;
  minRes?: number;
  maxRes?: number;
  maxSizeMB?: number;
}

export default function ImageEditor({
  onSave,
  onRemove,
  initialImageUrl = '',
  minRes = 500,
  maxRes = 4000,
  maxSizeMB = 5
}: ImageEditorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImageUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit states
  const [zoom, setZoom] = useState<number>(1); // 1 to 3
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [cropX, setCropX] = useState<number>(50); // percentage offset X
  const [cropY, setCropY] = useState<number>(50); // percentage offset Y
  const [bgMode, setBgMode] = useState<'original' | 'white' | 'transparent'>('original');

  // Status steps
  const [status, setStatus] = useState<'idle' | 'loading' | 'processing' | 'done'>('idle');
  const [progressMsg, setProgressMsg] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);

    // Format check
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Unsupported format. Please upload a JPG, JPEG, PNG, or WebP image.');
      return;
    }

    // Size check
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMsg(`File is too large. Maximum size allowed is ${maxSizeMB} MB.`);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;

      // Validate resolution
      const img = new Image();
      img.onload = () => {
        if (img.width < minRes || img.height < minRes) {
          setErrorMsg(`Resolution is too low (${img.width}x${img.height}). Minimum required: ${minRes}x${minRes}.`);
          setImageSrc(null);
          setSelectedFile(null);
          return;
        }
        if (img.width > maxRes || img.height > maxRes) {
          setErrorMsg(`Resolution is too high (${img.width}x${img.height}). Maximum allowed: ${maxRes}x${maxRes}.`);
          setImageSrc(null);
          setSelectedFile(null);
          return;
        }

        setImageSrc(src);
        setZoom(1);
        setRotation(0);
        setCropX(50);
        setCropY(50);
        setBgMode('original');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const triggerSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setImageSrc(null);
    setSelectedFile(null);
    setErrorMsg(null);
    onRemove();
  };

  // Perform canvas manipulation & optimization
  const processImage = async () => {
    if (!imageSrc) return;
    setStatus('processing');
    setProgressMsg('Optimizing...');

    // Load image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const getProcessedCanvas = (targetWidth: number, targetHeight: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return canvas;

      // Draw background if selected
      if (bgMode === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      } else if (bgMode === 'transparent') {
        ctx.clearRect(0, 0, targetWidth, targetHeight);
      }

      ctx.save();
      // Translate to center for rotation
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Calculate source bounding box from zoom and crop offsets
      const srcWidth = img.width / zoom;
      const srcHeight = img.height / zoom;

      // Map crop offsets (0-100) to actual image coordinates
      const maxOffsetX = img.width - srcWidth;
      const maxOffsetY = img.height - srcHeight;
      const srcX = (cropX / 100) * maxOffsetX;
      const srcY = (cropY / 100) * maxOffsetY;

      // Draw image onto canvas
      ctx.drawImage(
        img,
        srcX,
        srcY,
        srcWidth,
        srcHeight,
        -targetWidth / 2,
        -targetHeight / 2,
        targetWidth,
        targetHeight
      );

      ctx.restore();

      // Apply background color removal simulation (chroma keying corners)
      if (bgMode === 'white' || bgMode === 'transparent') {
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imgData.data;

        // Sample background from the corners
        const corners = [
          [0, 0],
          [targetWidth - 1, 0],
          [0, targetHeight - 1],
          [targetWidth - 1, targetHeight - 1]
        ];

        let rSum = 0, gSum = 0, bSum = 0;
        corners.forEach(([x, y]) => {
          const idx = (y * targetWidth + x) * 4;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
        });
        const rBg = rSum / 4;
        const gBg = gSum / 4;
        const bBg = bSum / 4;

        // Tolerance for color comparison
        const tolerance = 45;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const diff = Math.sqrt(
            Math.pow(r - rBg, 2) + Math.pow(g - gBg, 2) + Math.pow(b - bBg, 2)
          );

          if (diff < tolerance) {
            if (bgMode === 'white') {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
              data[i + 3] = 255;
            } else {
              // transparent
              data[i + 3] = 0;
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      return canvas;
    };

    try {
      // 1. High Resolution Version (1200 x 1200 px)
      setProgressMsg('Optimizing High Resolution version...');
      const canvasHigh = getProcessedCanvas(1200, 1200);
      const highUrl = canvasHigh.toDataURL('image/webp', 0.85);

      // 2. Medium Resolution Version (500 x 500 px)
      setProgressMsg('Creating Medium Resolution version...');
      const canvasMed = getProcessedCanvas(500, 500);
      const medUrl = canvasMed.toDataURL('image/webp', 0.80);

      // 3. Thumbnail Version (150 x 150 px)
      setProgressMsg('Creating Thumbnail...');
      const canvasThumb = getProcessedCanvas(150, 150);
      const thumbUrl = canvasThumb.toDataURL('image/webp', 0.75);

      setProgressMsg('Upload Complete');
      setStatus('done');

      onSave({
        high: highUrl,
        medium: medUrl,
        thumbnail: thumbUrl
      });
      
      setTimeout(() => setStatus('idle'), 1500);
    } catch (e) {
      console.error(e);
      setErrorMsg('Image optimization failed.');
      setStatus('idle');
    }
  };

  return (
    <div style={{
      padding: '1.5rem',
      borderRadius: '16px',
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#fff',
      fontFamily: 'var(--font-family, inherit)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.webp"
        style={{ display: 'none' }}
      />

      {!imageSrc ? (
        <div
          onClick={triggerSelectFile}
          style={{
            height: '220px',
            border: '2px dashed rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            gap: '0.5rem'
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--primary, #0070f3)')}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)')}
        >
          <span style={{ fontSize: '2.5rem' }}>📷</span>
          <span style={{ fontWeight: 600 }}>Select Product Image</span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            JPG, PNG, JPEG, WEBP (Max 5MB)
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Live Preview Window */}
          <div style={{
            position: 'relative',
            height: '240px',
            background: bgMode === 'white' ? '#fff' : bgMode === 'transparent' ? 'repeating-conic-gradient(#555 0% 25%, #666 0% 50%) 50% / 20px 20px' : '#222',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transform: `rotate(${rotation}deg) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.1s ease-out'
              }}
            />

            <button
              type="button"
              onClick={handleRemove}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(255, 0, 0, 0.8)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>

          {/* Edit Slider Adjustments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem' }}>🔍 Zoom ({zoom.toFixed(1)}x)</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ width: '60%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem' }}>🎛️ Crop Pan X</span>
              <input
                type="range"
                min="0"
                max="100"
                value={cropX}
                onChange={(e) => setCropX(parseInt(e.target.value))}
                style={{ width: '60%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem' }}>🎛️ Crop Pan Y</span>
              <input
                type="range"
                min="0"
                max="100"
                value={cropY}
                onChange={(e) => setCropY(parseInt(e.target.value))}
                style={{ width: '60%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                🔄 Rotate 90°
              </button>
              <button
                type="button"
                onClick={triggerSelectFile}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                🔄 Replace Image
              </button>
            </div>

            {/* AI Background Enhancer Mode */}
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                ✨ AI Background Enhancement
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['original', 'white', 'transparent'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBgMode(mode)}
                    style={{
                      flex: 1,
                      background: bgMode === mode ? 'var(--primary, #0070f3)' : 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      textTransform: 'capitalize'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {status !== 'idle' ? (
              <div style={{
                background: 'rgba(0, 112, 243, 0.2)',
                border: '1px solid var(--primary, #0070f3)',
                padding: '0.75rem',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '0.9rem',
                marginTop: '0.5rem'
              }}>
                ⚙️ {progressMsg}
              </div>
            ) : (
              <button
                type="button"
                onClick={processImage}
                style={{
                  background: 'var(--success, #00c851)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  marginTop: '0.5rem'
                }}
              >
                ✓ Optimize & Apply Image
              </button>
            )}
          </div>
        </div>
      )}

      {errorMsg && (
        <div style={{
          color: '#ff4444',
          fontSize: '0.85rem',
          textAlign: 'center',
          background: 'rgba(255, 68, 68, 0.1)',
          padding: '0.5rem',
          borderRadius: '8px'
        }}>
          ⚠️ {errorMsg}
        </div>
      )}
    </div>
  );
}
