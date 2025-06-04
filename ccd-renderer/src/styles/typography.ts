// styles/typography.ts
import { cva } from 'class-variance-authority';

export const typographyVariants = cva('', {
  variants: {
    variant: {
      'h1-sb': [
        '!font-pretendard', //tailwind.config.js에서  pretendard: ['Pretendard', 'sans-serif']로 정의했음
        'text-[var(--font-size-20)]',
        'font-[var(--font-sb)]',
        'leading-[var(--line-height-24)]',
        'tracking-[var(--spacing)]'
      ],
      'h2-sb': [
        '!font-pretendard',
        'text-[var(--font-size-16)]',
        'font-[var(--font-sb)]',
        'leading-[var(--line-height-16)]',
        'tracking-[var(--spacing)]'
      ],
      'h3-md': [
        '!font-pretendard',
        'text-[var(--font-size-16)]',
        'font-[var(--font-md)]',
        'leading-[var(--line-height-16)]',
        'tracking-[var(--spacing)]'
      ],
      'h4-md': [
        '!font-pretendard',
        'text-[var(--font-size-16)]',
        'font-[var(--font-rg)]',
        'leading-[var(--line-height-16)]',
        'tracking-[var(--spacing)]'
      ],
      'b1-sb': [
        '!font-pretendard',
        'text-[var(--font-size-14)]',
        'font-[var(--font-sb)]',
        'leading-[var(--line-height-16)]',
        'tracking-[var(--spacing)]'
      ],
      'b2-md': [
        '!font-pretendard',
        'text-[var(--font-size-14)]',
        'font-[var(--font-md)]',
        'font-[var(--font-rg)]',
        'leading-[var(--line-height-16)]',
        'tracking-[var(--spacing)]'
      ],
      'b3-rg': [
        '!font-pretendard',
        'text-[var(--font-size-14)]',
        'font-[var(--font-rg)]',
        'leading-[var(--line-height-16)]',
        'tracking-[var(--spacing)]'
      ],
      'd1-sb': [
        '!font-pretendard',
        'text-[var(--font-size-12)]',
        'font-[var(--font-sb)]',
        'leading-[var(--line-height-12)]',
        'tracking-[var(--spacing)]'
      ],
      'd2-md': [
        '!font-pretendard',
        'text-[var(--font-size-12)]',
        'font-[var(--font-md)]',
        'leading-[var(--line-height-12)]',
        'tracking-[var(--spacing)]'
      ],
      'd3-rg': [
        '!font-pretendard',
        'text-[var(--font-size-12)]',
        'font-[var(--font-rg)]',
        'leading-[var(--line-height-12)]',
        'tracking-[var(--spacing)]'
      ],
    }
  },
  defaultVariants: {
    variant: 'b1-sb'
  }
});