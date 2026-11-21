jest.mock('expo-linking', () => ({ createURL: (p: string) => `ascend://${p.replace(/^\//, '')}` }));
import { inviteLink, usernameFromLink } from '../lib/invite';

test('Einladungslink hin und zurück', () => {
  expect(inviteLink('mira.lifts')).toBe('ascend://add/mira.lifts');
  expect(usernameFromLink('ascend://add/mira.lifts')).toBe('mira.lifts');
  expect(usernameFromLink('exp://192.168.0.2:8081/--/add/Ben_99')).toBe('ben_99');
  expect(usernameFromLink('https://example.com/other')).toBeNull();
});
