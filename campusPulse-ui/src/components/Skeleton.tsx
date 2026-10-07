import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--radius-sm)',
  style,
}) => {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i}>
                <Skeleton width="70%" height="16px" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c}>
                  <Skeleton width={c === 0 ? '85%' : '60%'} height="18px" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const SkeletonTable = TableSkeleton;

export const SkeletonCard: React.FC<{ height?: string }> = ({ height = '180px' }) => {
  return (
    <div
      className="card"
      style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px',
      }}
    >
      <div>
        <Skeleton width="40%" height="18px" style={{ marginBottom: '12px' }} />
        <Skeleton width="90%" height="24px" style={{ marginBottom: '8px' }} />
        <Skeleton width="70%" height="14px" />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Skeleton width="50%" height="32px" borderRadius="var(--radius-md)" />
      </div>
    </div>
  );
};
