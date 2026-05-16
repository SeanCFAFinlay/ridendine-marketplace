'use client';

import * as React from 'react';
import { cn } from '../utils';

const baseFieldClasses = [
  'w-full rounded-md bg-surface px-4 py-2.5 text-base text-text transition-colors',
  'border placeholder:text-textSubtle',
  'focus:outline-none focus-visible:shadow-focus',
  'disabled:cursor-not-allowed disabled:bg-surfaceMuted disabled:text-textSubtle',
].join(' ');

function borderClass({ error, valid }: { error?: string; valid?: boolean }) {
  if (error) return 'border-danger focus:border-danger';
  if (valid) return 'border-success focus:border-success';
  return 'border-border focus:border-primary';
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  valid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, valid, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-text"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(baseFieldClasses, 'h-10', borderClass({ error, valid }), className)}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-textMuted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  valid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, valid, id, ...props }, ref) => {
    const textareaId = id || React.useId();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-text"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            baseFieldClasses,
            'min-h-[100px]',
            borderClass({ error, valid }),
            className,
          )}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="mt-1.5 text-xs text-textMuted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, children, ...props }, ref) => {
    const selectId = id || React.useId();
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-text"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          className={cn(baseFieldClasses, 'h-10 pr-8', borderClass({ error }), className)}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1.5 text-xs text-danger">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-textMuted">{hint}</p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
