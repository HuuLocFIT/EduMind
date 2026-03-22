import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsGrid } from './StatsGrid';

const getStatValueByLabel = (label: string) => {
  const labelElement = screen.getByText(label);
  const valueElement = labelElement.previousElementSibling;
  return valueElement?.textContent;
};

describe('StatsGrid', () => {
  it('shows Not Started as total minus started', () => {
    render(
      <StatsGrid
        stats={{
          total: 8,
          active: 7,
          completed: 1,
          started: 1,
        }}
      />
    );

    expect(screen.getByText('Not Started')).toBeTruthy();
    expect(getStatValueByLabel('Not Started')).toBe('7');
  });

  it('never shows negative Not Started count', () => {
    render(
      <StatsGrid
        stats={{
          total: 1,
          active: 1,
          completed: 0,
          started: 5,
        }}
      />
    );

    expect(screen.getByText('Not Started')).toBeTruthy();
    expect(getStatValueByLabel('Not Started')).toBe('0');
  });
});
