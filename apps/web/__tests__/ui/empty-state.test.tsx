/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyState, NoOrdersEmpty, NoMenuItemsEmpty, NoResultsEmpty } from '@ridendine/ui';

describe('EmptyState component - light-mode styling', () => {
  it('renders title text', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="No items to show." />);
    expect(screen.getByText('No items to show.')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(
      <EmptyState
        title="Empty"
        action={<button>Add item</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <EmptyState
        title="Empty"
        icon={<svg data-testid="test-icon" />}
      />
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('uses light background classes instead of dark slate-900', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toMatch(/slate-900|bg-slate-900/);
    expect(wrapper.className).not.toMatch(/border-white\/15/);
  });

  it('uses brand text token for title (light-mode legible)', () => {
    render(<EmptyState title="My Title" />);
    const heading = screen.getByText('My Title');
    expect(heading.className).not.toMatch(/text-white\b/);
    expect(heading.className).toMatch(/text-text\b/);
  });

  it('uses textMuted token for description text', () => {
    render(<EmptyState title="Title" description="Some description" />);
    const desc = screen.getByText('Some description');
    expect(desc.className).toMatch(/text-textMuted\b/);
  });

  it('applies extra className when passed', () => {
    const { container } = render(<EmptyState title="Empty" className="my-custom-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toMatch(/my-custom-class/);
  });

  it('NoOrdersEmpty renders without crashing', () => {
    render(<NoOrdersEmpty />);
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
  });

  it('NoMenuItemsEmpty renders without crashing', () => {
    render(<NoMenuItemsEmpty />);
    expect(screen.getByText('No menu items')).toBeInTheDocument();
  });

  it('NoResultsEmpty renders default message without query', () => {
    render(<NoResultsEmpty />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search or filters.')).toBeInTheDocument();
  });

  it('NoResultsEmpty renders query-specific message when query provided', () => {
    render(<NoResultsEmpty query="tacos" />);
    expect(screen.getByText(/No results for "tacos"/)).toBeInTheDocument();
  });
});
