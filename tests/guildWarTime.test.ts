import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  discordTimestamp,
  formatHHMM,
  getNextWeekdayTime,
  getTimezoneOffsetMs,
  getZonedParts,
  isValidTimezone,
  parseHHMM,
  planUpcomingGuildWarEvents,
  shouldAutoOpen,
  zonedTimeToUtc,
} from '../src/utils/guildWarTime.js';

const VN = 'Asia/Ho_Chi_Minh';
const NY = 'America/New_York';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('parseHHMM', () => {
  it('accepts valid 24-hour times', () => {
    assert.deepEqual(parseHHMM('20:00'), { hour: 20, minute: 0 });
    assert.deepEqual(parseHHMM('00:00'), { hour: 0, minute: 0 });
    assert.deepEqual(parseHHMM('23:59'), { hour: 23, minute: 59 });
    assert.deepEqual(parseHHMM(' 9:30 '), { hour: 9, minute: 30 });
  });

  it('rejects out-of-range and malformed values', () => {
    assert.equal(parseHHMM('24:00'), null);
    assert.equal(parseHHMM('20:60'), null);
    assert.equal(parseHHMM('8pm'), null);
    assert.equal(parseHHMM('2000'), null);
    assert.equal(parseHHMM(''), null);
  });

  it('round-trips through formatHHMM', () => {
    assert.equal(formatHHMM(9, 5), '09:05');
    assert.deepEqual(parseHHMM(formatHHMM(20, 0)), { hour: 20, minute: 0 });
  });
});

describe('isValidTimezone', () => {
  it('accepts real zones and rejects nonsense', () => {
    assert.equal(isValidTimezone(VN), true);
    assert.equal(isValidTimezone('UTC'), true);
    assert.equal(isValidTimezone('Not/AZone'), false);
  });
});

describe('getZonedParts', () => {
  it('reads wall-clock fields in the target zone', () => {
    // 2026-08-29T13:00Z is Saturday 20:00 in Vietnam (+7)
    const parts = getZonedParts(new Date('2026-08-29T13:00:00Z'), VN);

    assert.equal(parts.year, 2026);
    assert.equal(parts.month, 8);
    assert.equal(parts.day, 29);
    assert.equal(parts.hour, 20);
    assert.equal(parts.minute, 0);
    assert.equal(parts.isoWeekday, 6); // Saturday
  });

  it('normalizes midnight to hour 0', () => {
    const parts = getZonedParts(new Date('2026-08-29T17:00:00Z'), VN);

    assert.equal(parts.hour, 0);
    assert.equal(parts.day, 30);
    assert.equal(parts.isoWeekday, 7); // Sunday
  });
});

describe('getTimezoneOffsetMs', () => {
  it('reports a fixed offset for Vietnam', () => {
    assert.equal(getTimezoneOffsetMs(new Date('2026-08-29T13:00:00Z'), VN), 7 * HOUR);
    assert.equal(getTimezoneOffsetMs(new Date('2026-01-15T13:00:00Z'), VN), 7 * HOUR);
  });

  it('tracks daylight saving in New York', () => {
    assert.equal(getTimezoneOffsetMs(new Date('2026-01-15T18:00:00Z'), NY), -5 * HOUR);
    assert.equal(getTimezoneOffsetMs(new Date('2026-07-15T18:00:00Z'), NY), -4 * HOUR);
  });
});

describe('zonedTimeToUtc', () => {
  it('converts Vietnamese wall-clock time to UTC', () => {
    const utc = zonedTimeToUtc(2026, 8, 29, 20, 0, VN);

    assert.equal(utc.toISOString(), '2026-08-29T13:00:00.000Z');
  });

  it('handles the day either side of a DST change', () => {
    // 2026-03-08 is the US spring-forward date
    assert.equal(
      zonedTimeToUtc(2026, 3, 7, 20, 0, NY).toISOString(),
      '2026-03-08T01:00:00.000Z' // still EST (-5)
    );
    assert.equal(
      zonedTimeToUtc(2026, 3, 8, 20, 0, NY).toISOString(),
      '2026-03-09T00:00:00.000Z' // now EDT (-4)
    );
  });

  it('round-trips against getZonedParts', () => {
    const utc = zonedTimeToUtc(2026, 12, 25, 6, 30, VN);
    const parts = getZonedParts(utc, VN);

    assert.equal(parts.hour, 6);
    assert.equal(parts.minute, 30);
    assert.equal(parts.day, 25);
  });
});

describe('getNextWeekdayTime', () => {
  it('finds the coming Saturday from a Thursday', () => {
    // Thursday 2026-08-27, 12:00 Vietnam time
    const now = new Date('2026-08-27T05:00:00Z');
    const saturday = getNextWeekdayTime(now, 6, '20:00', VN);

    assert.equal(saturday.toISOString(), '2026-08-29T13:00:00.000Z');
    assert.equal(getZonedParts(saturday, VN).isoWeekday, 6);
  });

  it('skips to next week when today is the day but the time has passed', () => {
    // Saturday 2026-08-29, 21:00 Vietnam time — the 20:00 slot is gone
    const now = new Date('2026-08-29T14:00:00Z');
    const saturday = getNextWeekdayTime(now, 6, '20:00', VN);

    assert.equal(saturday.toISOString(), '2026-09-05T13:00:00.000Z');
  });

  it('keeps today when the time is still ahead', () => {
    // Saturday 2026-08-29, 09:00 Vietnam time
    const now = new Date('2026-08-29T02:00:00Z');

    assert.equal(
      getNextWeekdayTime(now, 6, '20:00', VN).toISOString(),
      '2026-08-29T13:00:00.000Z'
    );
  });

  it('treats an exact match as already passed', () => {
    const now = new Date('2026-08-29T13:00:00Z');

    assert.equal(
      getNextWeekdayTime(now, 6, '20:00', VN).toISOString(),
      '2026-09-05T13:00:00.000Z'
    );
  });

  it('preserves wall-clock time across a DST boundary', () => {
    // Wednesday 2026-03-04 in New York; the next Sunday crosses spring-forward
    const now = new Date('2026-03-04T17:00:00Z');
    const sunday = getNextWeekdayTime(now, 7, '20:00', NY);
    const parts = getZonedParts(sunday, NY);

    assert.equal(parts.hour, 20);
    assert.equal(parts.day, 8);
    assert.equal(sunday.toISOString(), '2026-03-09T00:00:00.000Z');
  });
});

describe('planUpcomingGuildWarEvents', () => {
  const config = {
    timezone: VN,
    satTime: '20:00',
    sunTime: '21:00',
    notifyLeadMin: 60,
    nudgeLeadMin: 15,
  };

  it('plans Saturday and Sunday as separate events', () => {
    // Thursday 2026-08-27, 12:00 Vietnam time
    const planned = planUpcomingGuildWarEvents(new Date('2026-08-27T05:00:00Z'), config);

    assert.equal(planned.length, 2);
    assert.equal(planned[0].day, 'sat');
    assert.equal(planned[1].day, 'sun');
    assert.equal(planned[0].eventAt.toISOString(), '2026-08-29T13:00:00.000Z');
    assert.equal(planned[1].eventAt.toISOString(), '2026-08-30T14:00:00.000Z');
  });

  it('derives reminder times from the configured lead minutes', () => {
    const planned = planUpcomingGuildWarEvents(new Date('2026-08-27T05:00:00Z'), config);

    for (const plan of planned) {
      assert.equal(plan.eventAt.getTime() - plan.notifyAt.getTime(), 60 * 60 * 1000);
      assert.equal(plan.eventAt.getTime() - plan.nudgeAt.getTime(), 15 * 60 * 1000);
      assert.ok(plan.notifyAt < plan.nudgeAt);
    }
  });

  it('is sorted soonest first even when Sunday comes first in the week', () => {
    // Saturday evening, after the Saturday slot: Sunday is next, Saturday is a week away
    const planned = planUpcomingGuildWarEvents(new Date('2026-08-29T14:00:00Z'), config);

    assert.equal(planned[0].day, 'sun');
    assert.equal(planned[1].day, 'sat');
    assert.ok(planned[0].eventAt < planned[1].eventAt);
  });
});

describe('shouldAutoOpen', () => {
  const config = { timezone: VN, openWeekday: 4, openTime: '12:00' };

  // Thursday 2026-08-27, 12:00 Vietnam time
  const thursdayNoon = new Date('2026-08-27T05:00:00Z');

  it('fires just after the Thursday window opens', () => {
    const now = new Date(thursdayNoon.getTime() + 30 * 1000);

    assert.equal(shouldAutoOpen(now, config, null), true);
  });

  it('does not fire before the window', () => {
    const now = new Date(thursdayNoon.getTime() - 60 * 1000);

    // The most recent Thursday noon was a week ago, well past the grace period
    assert.equal(shouldAutoOpen(now, config, null), false);
  });

  it('does not fire twice in the same week', () => {
    const now = new Date(thursdayNoon.getTime() + HOUR);

    assert.equal(shouldAutoOpen(now, config, thursdayNoon), false);
  });

  it('fires again the following week', () => {
    const nextThursday = new Date(thursdayNoon.getTime() + 7 * DAY);

    assert.equal(
      shouldAutoOpen(new Date(nextThursday.getTime() + 60 * 1000), config, thursdayNoon),
      true
    );
  });

  it('still fires after a short outage', () => {
    const now = new Date(thursdayNoon.getTime() + 6 * HOUR);

    assert.equal(shouldAutoOpen(now, config, null), true);
  });

  it('stays quiet after a long outage, rather than posting a stale weekend', () => {
    // Sunday: the Thursday window is three days gone
    const now = new Date(thursdayNoon.getTime() + 3 * DAY);

    assert.equal(shouldAutoOpen(now, config, null), false);
  });
});

describe('discordTimestamp', () => {
  it('renders the Discord timestamp tag', () => {
    const date = new Date('2026-08-29T13:00:00Z');

    assert.equal(discordTimestamp(date, 'F'), '<t:1788008400:F>');
    assert.equal(discordTimestamp(date, 'R'), '<t:1788008400:R>');
  });
});
