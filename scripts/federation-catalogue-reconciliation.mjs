const normalize = value => String(value ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toUpperCase();
const id = value => /^[1-9]\d{0,9}$/.test(String(value));
const key = (round, home, away) => JSON.stringify([normalize(round), String(home), String(away)]);

// The caller supplies records from one federation, season and competition.
// The public calendar never authorizes a new numeric group or a second match row.
export function reconcileCalendarIdentity(fixture, catalogue) {
 const {official_match_id: report, round_label: round, home_id: home, away_id: away, group} = fixture;
 if (!id(report) || !id(home) || !id(away) || home === away || !normalize(round)) {
  return {status: 'incomplete_identity'};
 }
 const byCode = catalogue.filter(row => String(row.code) === String(report));
 const matchingSides = row => String(row.home) === String(home) && String(row.away) === String(away);
 if (byCode.length) {
  return byCode.length === 1 && matchingSides(byCode[0])
   ? {status: 'already_linked'} : {status: 'conflicting_code'};
 }
 const matchingRound = catalogue.filter(row => matchingSides(row) && key(row.round,row.home,row.away) === key(round,home,away));
 const eligible = matchingRound.filter(row => !group || normalize(row.group) === normalize(group));
 if (eligible.length !== 1) return {status: eligible.length ? 'ambiguous' : 'unmatched'};
 const [match] = eligible;
 if (match.code) return {status: 'conflicting_code'};
 if (!id(match.groupId)) return {status: 'missing_numeric_group'};
 return {status: 'existing_provisional', groupId: match.groupId};
}
