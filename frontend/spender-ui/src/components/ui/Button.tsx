import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

const variantClasses = {
  primary: 'bg-amber-500 hover:bg-amber-600 text-white',
  ghost:   'bg-transparent border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900',
  danger:  'bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white',
};

const sizeClasses = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 font-medium rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
