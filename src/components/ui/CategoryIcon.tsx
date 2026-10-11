import React from 'react';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface CategoryIconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  size = 18,
  color,
  className = '',
}) => {
  // Access Lucide icon dynamically with fallback
  const IconComponent = (Icons as unknown as Record<string, LucideIcon>)[name] || Icons.Tag;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', color }}>
      <IconComponent size={size} className={className} />
    </span>
  );
};
