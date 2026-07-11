import { describe, expect, it } from 'vitest';
import { inviteMessage } from '../src/lib/sharing';

describe('invitation copy', () => {
  it('states the exact list and edit scope', () => {
    expect(inviteMessage({ listName: 'Weekend groceries', role: 'editor', url: 'https://coshop.test/join/token' }))
      .toBe('Join my “Weekend groceries” shopping list in CoShop as an editor: https://coshop.test/join/token');
  });
  it('states view-only scope without implying edit access', () => {
    expect(inviteMessage({ listName: 'Party supplies', role: 'viewer', url: 'https://coshop.test/join/token' }))
      .toContain('as a viewer');
  });
});
