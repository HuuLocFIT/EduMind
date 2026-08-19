import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AutoHeightTransition } from './AutoHeightTransition';

describe('AutoHeightTransition', () => {
  it('keeps the initial cache-hit content naturally sized', () => {
    render(
      <AutoHeightTransition transitionKey="taking">
        <fieldset><legend>Quiz question</legend></fieldset>
      </AutoHeightTransition>,
    );

    const container = screen.getByText('Quiz question').parentElement?.parentElement?.parentElement;
    expect(container).toHaveStyle({ height: 'auto' });
  });

  it('releases a measured height after a phase transition', () => {
    const { rerender } = render(
      <AutoHeightTransition transitionKey="loading">
        <div>Loading quiz</div>
      </AutoHeightTransition>,
    );

    rerender(
      <AutoHeightTransition transitionKey="taking">
        <fieldset><legend>Restored question</legend></fieldset>
      </AutoHeightTransition>,
    );

    const container = screen.getByText('Restored question').parentElement?.parentElement?.parentElement;
    expect(container).toBeInTheDocument();
    fireEvent.transitionEnd(container!, { propertyName: 'height' });
    expect(container).toHaveStyle({ height: 'auto' });
  });
});
