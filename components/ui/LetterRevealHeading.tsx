'use client';

import React from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

export interface LetterRevealHeadingProps {
  /** The text string to animate per letter */
  text: string;
  /** HTML heading tag to render (default: 'h3') */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'span' | 'div';
  /** Additional Tailwind CSS class names */
  className?: string;
  /** Custom delay before animation starts (seconds, default: 0.05) */
  delay?: number;
  /** Stagger interval between each letter (seconds, default: 0.02) */
  stagger?: number;
  /** Trigger animation once when scrolled into view (default: true) */
  once?: boolean;
  /** Viewport margin for scroll trigger (default: '0px 0px -40px 0px') */
  viewportMargin?: string;
  /** Use cinematic text gradient styling (default: false) */
  gradient?: boolean;
  /** Subtle neon glow shadow behind the text */
  glow?: boolean;
}

export function LetterRevealHeading({
  text,
  as: Component = 'h3',
  className = '',
  delay = 0.05,
  stagger = 0.018,
  once = true,
  viewportMargin = '0px 0px -40px 0px',
  gradient = false,
  glow = false,
}: LetterRevealHeadingProps) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(' ');

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const letterVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 16,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const glowStyles = glow ? 'drop-shadow-[0_0_25px_rgba(34,211,238,0.25)]' : '';
  const textColor = /\btext-(?!transparent)/.test(className) ? '' : 'text-white';

  if (shouldReduceMotion) {
    return (
      <Component
        className={`font-display font-extrabold tracking-[-0.035em] ${textColor} ${glowStyles} ${className}`}
      >
        {text}
      </Component>
    );
  }

  return (
    <Component
      aria-label={text}
      className={`font-display font-extrabold tracking-[-0.035em] ${textColor} ${glowStyles} ${className}`}
    >
      <span className="sr-only">{text}</span>
      <motion.span
        aria-hidden="true"
        className="inline"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin: viewportMargin as any }}
      >
        {words.map((word, wordIdx) => (
          <React.Fragment key={`w-${wordIdx}`}>
            <span className="inline-block whitespace-nowrap">
              {Array.from(word).map((char, charIdx) => (
                <motion.span
                  key={`c-${wordIdx}-${charIdx}`}
                  variants={letterVariants}
                  className="inline-block"
                >
                  {char}
                </motion.span>
              ))}
            </span>
            {wordIdx < words.length - 1 && (
              <span className="inline-block">&nbsp;</span>
            )}
          </React.Fragment>
        ))}
      </motion.span>
    </Component>
  );
}

export const AnimatedH1 = (props: Omit<LetterRevealHeadingProps, 'as'>) => (
  <LetterRevealHeading as="h1" {...props} />
);

export const AnimatedH2 = (props: Omit<LetterRevealHeadingProps, 'as'>) => (
  <LetterRevealHeading as="h2" {...props} />
);

export const AnimatedH3 = (props: Omit<LetterRevealHeadingProps, 'as'>) => (
  <LetterRevealHeading as="h3" {...props} />
);
