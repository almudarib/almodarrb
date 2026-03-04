'use client';
import Link from 'next/link';
import { Button } from '@mui/material';
import type { ButtonProps } from '@mui/material/Button';
import type { ElementType } from 'react';
export type LinkButtonProps = Omit<ButtonProps, 'component' | 'href'> & { href: string };
export function LinkButton({ href, ...rest }: LinkButtonProps) {
  return <Button component={Link as ElementType} href={href} {...rest} />;
}
