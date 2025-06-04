import { cva } from 'class-variance-authority';

export const colors = {
  white: 'var(--white)', 
  gray: {
    100: 'var(--gray-100)',
    200: 'var(--gray-200)',
    300: 'var(--gray-300)',
  },
  red:  'var(--red)', 
  blue: {
    100: 'var(--blue-100)',
    200: 'var(--blue-200)',
    300: 'var(--blue-300)',
  },
};

export const colorVariants = cva('', {
  variants: {
    color: {
        'white': 'bg-[var(--white)]',
        'gray-100': 'text-[var(--gray-100)]',
        'gray-200': 'text-[var(--gray-200)]',
        'gray-300': 'text-[var(--gray-300)]',
        'red': 'bg-[var(--red)]',
        'blue-100': 'bg-[var(--blue-100)]',
        'blue-200': 'bg-[var(--blue-200)]',
        'blue-300': 'bg-[var(--blue-300)]'
    },
    bg: {
        'white': 'bg-[var(--white)]',
        'gray-100': 'text-[var(--gray-100)]',
        'gray-200': 'text-[var(--gray-200)]',
        'gray-300': 'text-[var(--gray-300)]',
        'red': 'bg-[var(--red)]',
        'blue-100': 'bg-[var(--blue-100)]',
        'blue-200': 'bg-[var(--blue-200)]',
        'blue-300': 'bg-[var(--blue-300)]'
    }
  },
  defaultVariants: {
    color: 'gray-300',
    bg: 'white'
  }
});