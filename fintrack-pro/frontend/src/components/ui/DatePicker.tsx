import * as React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DatePickerProps {
  label?: string;
  error?: string;
  helperText?: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, helperText, value, onChange, placeholder, disabled, className, name }, ref) => {
    const id = name || 'date-picker';

    // Convert Date to yyyy-MM-dd format for input
    const dateToString = (date: Date | undefined): string => {
      if (!date) return '';
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Convert yyyy-MM-dd string to Date
    const stringToDate = (str: string): Date | undefined => {
      if (!str) return undefined;
      const date = new Date(str + 'T00:00:00');
      return isNaN(date.getTime()) ? undefined : date;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = stringToDate(e.target.value);
      onChange?.(date);
    };

    const handleCalendarClick = () => {
      const input = document.getElementById(id) as HTMLInputElement;
      if (input && !disabled) {
        input.showPicker?.();
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            name={name}
            type="date"
            value={dateToString(value)}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'pr-10', // Make room for calendar icon
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            ref={ref}
          />
          <button
            type="button"
            onClick={handleCalendarClick}
            disabled={disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            tabIndex={-1}
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-destructive">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
