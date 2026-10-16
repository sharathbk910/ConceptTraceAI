import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number; height?: string }> = ({
  rows = 3,
  height = 'h-12',
}) => {
  return (
    <div className="w-full space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`w-full ${height} bg-slate-200/80 rounded-xl`}
          style={{ opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  );
};
