import { OwnershipMap, FighterOwner } from './types';

/**
 * Ownership is matched by fighter id, but scraped UFC data sometimes carries
 * duplicate fighter rows (a bout can reference a different row than the one on
 * a roster). To stay robust we also index owners by normalized name and fall
 * back to that when an id lookup misses.
 */
export function nameKey(name: string): string {
  return 'name:' + name.trim().toLowerCase();
}

/** Register an owner under both its fighter id and its name. */
export function addOwner(map: OwnershipMap, fighterId: string, name: string | null | undefined, owner: FighterOwner) {
  map[fighterId] = owner;
  if (name) map[nameKey(name)] = owner;
}

/** Resolve the owner of a fighter, preferring id and falling back to name. */
export function ownerFor(map: OwnershipMap, fighter: { id: string; name: string }): FighterOwner | undefined {
  return map[fighter.id] ?? map[nameKey(fighter.name)];
}
