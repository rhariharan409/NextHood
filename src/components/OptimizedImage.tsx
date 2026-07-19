'use client';

import React, { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src?: string;
  alt: string;
  category?: string;
  style?: React.CSSProperties;
  className?: string;
  priority?: boolean;
}

interface PlaceholderConfig {
  emoji: string;
  label: string;
  gradient: string;
  textColor: string;
}

const CATEGORY_PLACEHOLDERS: Record<string, PlaceholderConfig> = {
  dairy: {
    emoji: '🥛',
    label: 'Dairy',
    gradient: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
    textColor: '#0369a1'
  },
  bakery: {
    emoji: '🍞',
    label: 'Bakery',
    gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    textColor: '#b45309'
  },
  vegetables: {
    emoji: '🥬',
    label: 'Vegetables',
    gradient: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    textColor: '#15803d'
  },
  fruits: {
    emoji: '🍎',
    label: 'Fruits',
    gradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    textColor: '#b91c1c'
  },
  'personal care': {
    emoji: '🧴',
    label: 'Personal Care',
    gradient: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
    textColor: '#6b21a8'
  },
  medicines: {
    emoji: '💊',
    label: 'Medicines',
    gradient: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)',
    textColor: '#be123c'
  },
  electronics: {
    emoji: '📱',
    label: 'Electronics',
    gradient: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
    textColor: '#4338ca'
  },
  grocery: {
    emoji: '🛒',
    label: 'Grocery',
    gradient: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)',
    textColor: '#c2410c'
  }
};

export default function OptimizedImage({
  src,
  alt,
  category = '',
  style,
  className,
  priority = false
}: OptimizedImageProps) {
  const [error, setError] = useState(false);

  // Reset error state if src changes
  useEffect(() => {
    setError(false);
  }, [src]);

  // Resolve config based on category string matching
  const getPlaceholderConfig = (catName: string): PlaceholderConfig => {
    const name = catName.toLowerCase().trim();
    if (name.includes('dairy') || name.includes('milk') || name.includes('curd') || name.includes('butter')) {
      return CATEGORY_PLACEHOLDERS.dairy;
    }
    if (name.includes('bakery') || name.includes('bread') || name.includes('cake') || name.includes('cookie') || name.includes('donut')) {
      return CATEGORY_PLACEHOLDERS.bakery;
    }
    if (name.includes('vegetable') || name.includes('veg') || name.includes('onion') || name.includes('tomato')) {
      return CATEGORY_PLACEHOLDERS.vegetables;
    }
    if (name.includes('fruit') || name.includes('apple') || name.includes('banana')) {
      return CATEGORY_PLACEHOLDERS.fruits;
    }
    if (name.includes('personal') || name.includes('care') || name.includes('soap') || name.includes('shampoo') || name.includes('toothpaste') || name.includes('hygiene') || name.includes('beauty')) {
      return CATEGORY_PLACEHOLDERS['personal care'];
    }
    if (name.includes('pharmacy') || name.includes('medicine') || name.includes('health') || name.includes('tablet') || name.includes('medical')) {
      return CATEGORY_PLACEHOLDERS.medicines;
    }
    if (name.includes('electronic') || name.includes('device') || name.includes('mobile') || name.includes('keyboard') || name.includes('headphones')) {
      return CATEGORY_PLACEHOLDERS.electronics;
    }
    // Default to Grocery
    return CATEGORY_PLACEHOLDERS.grocery;
  };

  const config = getPlaceholderConfig(category);

  // Check if image URL is a valid uploaded URL or fallback
  const hasValidImage = src && src.trim() !== '' && src !== 'null' && src !== 'undefined';

  if (!hasValidImage || error) {
    const isSmall = style && (style.height || style.maxHeight);
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: config.gradient,
          color: config.textColor,
          width: '100%',
          height: '100%',
          minHeight: isSmall ? 'auto' : '120px',
          borderRadius: '12px',
          padding: isSmall ? '0.25rem' : '1rem',
          userSelect: 'none',
          boxSizing: 'border-box',
          ...style
        }}
      >
        <span style={{ fontSize: isSmall ? '1.25rem' : '2.5rem', lineHeight: 1 }}>{config.emoji}</span>
        {!isSmall && (
          <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '0.25rem' }}>
            {config.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '12px',
        ...style
      }}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setError(true)}
    />
  );
}
