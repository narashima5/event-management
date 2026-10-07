import React from 'react';

interface BadgeProps {
  status: string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  let badgeClass = 'badge-neutral';
  const s = (status || '').toUpperCase();

  if (['PUBLISHED', 'CONFIRMED', 'PRESENT', 'ACTIVE', 'RESULTS_PUBLISHED'].includes(s)) {
    badgeClass = 'badge-success';
  } else if (['REGISTRATION_OPEN', 'ONGOING', '1ST', 'SUBMITTED', 'COMPLETED'].includes(s)) {
    badgeClass = 'badge-primary';
  } else if (['JUDGING', 'PENDING', 'DRAFT', '2ND', '3RD'].includes(s)) {
    badgeClass = 'badge-warning';
  } else if (['REGISTRATION_CLOSED', 'CANCELLED', 'DISQUALIFIED', 'ARCHIVED', 'ABSENT', 'INACTIVE'].includes(s)) {
    badgeClass = 'badge-danger';
  }

  const formatted = status ? status.replace(/_/g, ' ') : '';

  return <span className={`badge ${badgeClass}`}>{formatted}</span>;
};
