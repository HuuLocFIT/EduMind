import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload, UploadedFile } from './FileUpload';

const makeFile = (name: string, size = 1024, type = 'text/plain') => {
  const file = new File(['x'.repeat(size)], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const selectFiles = (input: HTMLElement, files: File[]) => {
  fireEvent.change(input, { target: { files } });
};

describe('FileUpload — uncontrolled (no files prop)', () => {
  it('accumulates multiple selected files and renders the list', () => {
    const onFilesChange = vi.fn();
    render(
      <FileUpload multiple maxFiles={5} onFilesChange={onFilesChange} label="Docs" />
    );
    const input = screen.getByLabelText('Docs') as HTMLInputElement;

    selectFiles(input, [makeFile('a.txt'), makeFile('b.txt')]);
    expect(screen.getByText('a.txt')).toBeInTheDocument();
    expect(screen.getByText('b.txt')).toBeInTheDocument();
    expect(onFilesChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ status: 'pending' }),
      expect.objectContaining({ status: 'pending' }),
    ]);

    selectFiles(input, [makeFile('c.txt')]);
    expect(screen.getByText('a.txt')).toBeInTheDocument();
    expect(screen.getByText('b.txt')).toBeInTheDocument();
    expect(screen.getByText('c.txt')).toBeInTheDocument();
    expect(onFilesChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ file: expect.objectContaining({ name: 'a.txt' }) }),
      expect.objectContaining({ file: expect.objectContaining({ name: 'b.txt' }) }),
      expect.objectContaining({ file: expect.objectContaining({ name: 'c.txt' }) }),
    ]);
  });

  it('removes a file from internal state when its remove button is clicked', () => {
    const onFilesChange = vi.fn();
    render(
      <FileUpload multiple maxFiles={5} onFilesChange={onFilesChange} label="Docs" />
    );
    const input = screen.getByLabelText('Docs') as HTMLInputElement;

    selectFiles(input, [makeFile('a.txt'), makeFile('b.txt')]);
    const removeButtons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(removeButtons[0]);

    expect(screen.queryByText('a.txt')).not.toBeInTheDocument();
    expect(screen.getByText('b.txt')).toBeInTheDocument();
    expect(onFilesChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ file: expect.objectContaining({ name: 'b.txt' }) }),
    ]);
  });

  it('respects maxFiles and stops accepting new files once the cap is reached', () => {
    const onFilesChange = vi.fn();
    render(
      <FileUpload multiple maxFiles={2} onFilesChange={onFilesChange} label="Docs" />
    );
    const input = screen.getByLabelText('Docs') as HTMLInputElement;

    selectFiles(input, [makeFile('a.txt'), makeFile('b.txt'), makeFile('c.txt')]);

    expect(screen.getByText('a.txt')).toBeInTheDocument();
    expect(screen.getByText('b.txt')).toBeInTheDocument();
    expect(screen.queryByText('c.txt')).not.toBeInTheDocument();
  });
});

describe('FileUpload — controlled (files prop provided)', () => {
  it('renders status icons based on the controlled files prop', () => {
    const onFilesChange = vi.fn();
    const successFile: UploadedFile = {
      file: makeFile('success.txt'),
      status: 'success',
    };
    const errorFile: UploadedFile = {
      file: makeFile('error.txt'),
      status: 'error',
      error: 'Upload failed',
    };

    const { rerender } = render(
      <FileUpload multiple maxFiles={5} onFilesChange={onFilesChange} files={[successFile]} label="Docs" />
    );

    expect(screen.getByText('success.txt')).toBeInTheDocument();
    const successRow = screen.getByText('success.txt').closest('div.flex.items-center.justify-between');
    expect(successRow?.querySelector('svg.text-green-500')).toBeInTheDocument();

    rerender(
      <FileUpload multiple maxFiles={5} onFilesChange={onFilesChange} files={[errorFile]} label="Docs" />
    );

    expect(screen.queryByText('success.txt')).not.toBeInTheDocument();
    expect(screen.getByText('error.txt')).toBeInTheDocument();
    const errorRow = screen.getByText('error.txt').closest('div.flex.items-center.justify-between');
    expect(errorRow?.querySelector('svg.text-red-500')).toBeInTheDocument();
  });

  it('does not resurrect a file removed by the parent, and counts maxFiles against the new list', () => {
    const onFilesChange = vi.fn();
    const fileA: UploadedFile = { file: makeFile('a.txt'), status: 'pending' };
    const fileB: UploadedFile = { file: makeFile('b.txt'), status: 'pending' };

    const { rerender } = render(
      <FileUpload multiple maxFiles={2} onFilesChange={onFilesChange} files={[fileA, fileB]} label="Docs" />
    );

    expect(screen.getByText('a.txt')).toBeInTheDocument();
    expect(screen.getByText('b.txt')).toBeInTheDocument();

    // Parent removes fileA, re-renders with only fileB left.
    rerender(
      <FileUpload multiple maxFiles={2} onFilesChange={onFilesChange} files={[fileB]} label="Docs" />
    );
    expect(screen.queryByText('a.txt')).not.toBeInTheDocument();
    expect(screen.getByText('b.txt')).toBeInTheDocument();

    // Select a new file — the removed one must not come back, and maxFiles
    // must be evaluated against the (post-removal) two-item list, not stale
    // internal accumulation.
    const input = screen.getByLabelText('Docs') as HTMLInputElement;
    selectFiles(input, [makeFile('c.txt')]);

    expect(onFilesChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ file: expect.objectContaining({ name: 'b.txt' }) }),
      expect.objectContaining({ file: expect.objectContaining({ name: 'c.txt' }) }),
    ]);
    expect(onFilesChange).not.toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ file: expect.objectContaining({ name: 'a.txt' }) }),
      ])
    );
  });
});
