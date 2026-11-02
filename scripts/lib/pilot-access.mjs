import crypto from 'node:crypto';

// Random invitation secrets have 256 bits of entropy; only their digest is stored.
export const digest = secret => crypto.createHash('sha256').update(secret).digest('hex');
export function validateAccess(records) {
  if (!Array.isArray(records) || !records.length) throw Error('Empty access list');
  const ids = new Set();
  for (const r of records) {
    if (!/^[a-f0-9]{64}$/.test(r.digest) || ids.has(r.digest) ||
        !['operator', 'coach', 'external'].includes(r.role) ||
        !/^[a-z0-9-]{1,64}$/.test(r.user) || !r.match || !r.team || !['RFEP','FECAPA'].includes(r.federation) ||
        !Number.isFinite(r.expiresAt)) throw Error('Invalid local access configuration');
    ids.add(r.digest);
  }
  return records;
}
export function invitationGrant(records, secret, match, team, now = Date.now()) {
  if (typeof secret !== 'string' || secret.length > 256) return null;
  const hash = Buffer.from(digest(secret), 'hex');
  const r = records.find(r => crypto.timingSafeEqual(Buffer.from(r.digest, 'hex'), hash));
  if (!r || r.expiresAt <= now || r.match !== match || r.team !== team) return null;
  return {match: r.match, club: r.federation + ':' + r.team, role: r.role,
    user: r.user, expiresAt: Math.min(r.expiresAt, now + 3600000)};
}
