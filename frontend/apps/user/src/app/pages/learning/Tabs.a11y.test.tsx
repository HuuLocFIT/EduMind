import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@edumind/user-ui';

const ExampleTabs = ({ onChange = vi.fn() }: { onChange?: (value: string) => void }) => (
  <Tabs defaultValue="all" onValueChange={onChange}>
    <TabsList aria-label="Course filters">
      <TabsTrigger value="all">All</TabsTrigger>
      <TabsTrigger value="active">Active</TabsTrigger>
      <TabsTrigger value="completed">Completed</TabsTrigger>
    </TabsList>
    <TabsContent value="all">All courses</TabsContent>
    <TabsContent value="active">Active courses</TabsContent>
    <TabsContent value="completed">Completed courses</TabsContent>
  </Tabs>
);

describe('shared Tabs accessibility', () => {
  it('links each tab to its panel and exposes a labelled tablist', () => {
    render(<ExampleTabs />);

    const tablist = screen.getByRole('tablist', { name: 'Course filters' });
    const allTab = screen.getByRole('tab', { name: 'All' });
    const allPanel = screen.getByRole('tabpanel', { name: 'All' });

    expect(tablist).toBeInTheDocument();
    expect(allTab).toHaveAttribute('aria-controls', allPanel.id);
    expect(allPanel).toHaveAttribute('aria-labelledby', allTab.id);
    expect(allTab).toHaveAttribute('aria-selected', 'true');
    expect(allTab).toHaveAttribute('tabindex', '0');
  });

  it('contains horizontal overflow within the tablist on narrow viewports', () => {
    render(<ExampleTabs />);

    const tablist = screen.getByRole('tablist', { name: 'Course filters' });
    const tabs = screen.getAllByRole('tab');

    expect(tablist).toHaveClass(
      'w-full',
      'max-w-full',
      'overflow-x-auto',
      'overflow-y-hidden',
    );
    tabs.forEach((tab) => {
      expect(tab).toHaveClass('shrink-0', 'whitespace-nowrap');
    });
  });

  it('supports arrow, Home and End keys with roving tabindex and retained focus', async () => {
    const user = userEvent.setup();
    render(<ExampleTabs />);
    const all = screen.getByRole('tab', { name: 'All' });

    all.focus();
    await user.keyboard('{ArrowRight}');
    const active = screen.getByRole('tab', { name: 'Active' });
    expect(active).toHaveFocus();
    expect(active).toHaveAttribute('aria-selected', 'true');
    expect(all).toHaveAttribute('tabindex', '-1');

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Completed' })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(all).toHaveFocus();
  });
});
