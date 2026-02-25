import { clsx } from 'clsx';

interface CheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({ id, label, checked, onChange, className }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={clsx(
        'flex cursor-pointer items-center gap-3 select-none',
        className,
      )}
    >
      <div className="relative flex items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div
          className={clsx(
            'h-5 w-5 rounded border-2 transition-colors flex items-center justify-center',
            checked
              ? 'border-sotto-700 bg-sotto-700'
              : 'border-sotto-300 bg-white',
          )}
        >
          {checked && (
            <svg
              className="h-3 w-3 text-white"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="2,6 5,9 10,3" />
            </svg>
          )}
        </div>
      </div>
      <span className={clsx('text-sm', checked ? 'line-through text-sotto-400' : 'text-sotto-800')}>
        {label}
      </span>
    </label>
  );
}
