import { describe, expect, it } from 'vitest';
import { GatewayError } from '@/lib/supabase/server';
import { sqlOutcome } from '@/lib/sql-errors';

describe('sqlOutcome', () => {
  it.each([
    ['42501', 'forbidden'],
    ['55000', 'conflict'],
    ['22023', 'invalid'],
    ['23514', 'invalid'],
    ['P0002', 'notfound'],
    ['23505', 'error'],
    ['XX000', 'error']
  ] as const)('code %s donne %s', (code, expected) => {
    expect(sqlOutcome(new GatewayError(400, code))).toBe(expected);
  });

  it('classe une erreur sans code ou étrangère en error', () => {
    expect(sqlOutcome(new GatewayError(500, null))).toBe('error');
    expect(sqlOutcome(new Error('42501'))).toBe('error');
    expect(sqlOutcome(null)).toBe('error');
    expect(sqlOutcome('55000')).toBe('error');
  });
});
