<script lang="ts">
  import type { DayStat, StreakInfo, WorkSummary } from '$lib/types';
  import * as m from '$paraglide/messages.js';
  import { getLocale } from '$paraglide/runtime.js';
  import {
    toPersianDigits,
    formatJalaliDate,
    formatWorkDuration,
    PERSIAN_WEEKDAYS_SHORT,
  } from '$lib/utils/jalali';

  let {
    week,
    streak,
    summary = null,
  }: { week: DayStat[] | null; streak: StreakInfo | null; summary?: WorkSummary | null } = $props();

  const isPersian = $derived(getLocale() === 'fa');

  const CHART_H = 140; // px, max bar height
  const BAR_W = 52; // px per bar
  const BAR_GAP = 16; // px between bars
  const CHART_W = 7 * (BAR_W + BAR_GAP) - BAR_GAP; // 412px

  // Reactive to app language setting — updates when user changes language in Settings.
  const shortFmt = $derived(new Intl.DateTimeFormat(getLocale(), { weekday: 'short' }));
  const narrowFmt = $derived(new Intl.DateTimeFormat(getLocale(), { weekday: 'narrow' }));

  // Helper for Persian weekday narrow label (Saturday -> 0)
  function getPersianNarrow(d: Date): string {
    const jsDay = d.getDay(); // 0 = Sun, 6 = Sat
    const pIdx = jsDay === 6 ? 0 : jsDay + 1;
    return PERSIAN_WEEKDAYS_SHORT[pIdx] ?? narrowFmt.format(d);
  }

  // Build a 7-day array (today and the previous 6 days), oldest first.
  const days = $derived.by(() => {
    const countByDate = new Map((week ?? []).map((d) => [d.date, d.rounds]));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-');

      const shortLabel = isPersian ? getPersianNarrow(d) : narrowFmt.format(d);
      const fullLabel = isPersian ? formatJalaliDate(d, 'short') : shortFmt.format(d);

      return {
        date: dateStr,
        label: fullLabel,
        short: shortLabel,
        rounds: countByDate.get(dateStr) ?? 0,
        isToday: i === 6,
      };
    });
  });

  const maxRounds = $derived(Math.max(1, ...days.map((d) => d.rounds)));
  const totalWeek = $derived(days.reduce((s, d) => s + d.rounds, 0));
  const hasData = $derived(totalWeek > 0);

  function fmtVal(n: number | string): string {
    return isPersian ? toPersianDigits(n) : String(n);
  }
</script>

<div class="view">
  <!-- Summary row -->
  <div class="summary">
    <div class="summary-item">
      <span class="summary-label">{m.stats_this_week()}</span>
      <span class="summary-value">
        {fmtVal(totalWeek)}
        {m.stats_rounds().toLowerCase()}
        {#if summary && summary.week_work_secs > 0}
          <span class="summary-time">({formatWorkDuration(summary.week_work_secs, isPersian)})</span>
        {/if}
      </span>
    </div>
    {#if streak}
      <div class="summary-item streak">
        <span class="summary-label">{m.stats_current_streak()}</span>
        <span class="summary-value">
          {#if streak.current > 0}
            <span class="flame" aria-hidden="true">🔥</span>{fmtVal(streak.current)}
            {streak.current === 1 ? m.stats_day() : m.stats_days()}
          {:else}
            <span class="streak-none">{m.stats_no_active_streak()}</span>
          {/if}
        </span>
      </div>
    {/if}
  </div>

  <!-- Bar chart -->
  <div class="chart-section">
    {#if !hasData}
      <div class="empty">
        <span>{m.stats_no_sessions_week()}</span>
      </div>
    {:else}
      <div class="chart-wrap">
        <svg
          width={CHART_W}
          height={CHART_H + 36}
          viewBox="0 0 {CHART_W} {CHART_H + 36}"
          class="chart"
        >
          {#each days as day, i}
            {@const barH = Math.max(
              day.rounds > 0 ? 4 : 0,
              Math.round((day.rounds / maxRounds) * CHART_H)
            )}
            {@const x = i * (BAR_W + BAR_GAP)}
            {@const y = CHART_H - barH}

            <!-- Bar -->
            <rect
              {x}
              {y}
              width={BAR_W}
              height={barH}
              rx="3"
              class="bar"
              class:bar-today={day.isToday}
              class:bar-empty={day.rounds === 0}
              style="--bar-delay: {i * 40}ms"
            />

            <!-- Round count label above bar -->
            {#if day.rounds > 0}
              <text x={x + BAR_W / 2} y={y - 5} text-anchor="middle" class="count-label"
                >{fmtVal(day.rounds)}</text
              >
            {/if}

            <!-- Day label -->
            <text
              x={x + BAR_W / 2}
              y={CHART_H + 20}
              text-anchor="middle"
              class="day-label"
              class:day-label-today={day.isToday}>{day.short}</text
            >
          {/each}

          <!-- Baseline -->
          <line x1="0" y1={CHART_H} x2={CHART_W} y2={CHART_H} class="baseline" />
        </svg>
      </div>
    {/if}
  </div>
</div>

<style>
  .view {
    display: flex;
    flex-direction: column;
    height: 100%;
    animation: app-fade-in 0.2s ease;
  }

  /* ── Summary row ─────────────────────────────────────────── */
  .summary {
    display: flex;
    gap: 32px;
    padding: 24px 32px;
    border-bottom: 1px solid var(--color-separator);
  }

  .summary-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .summary-label {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-foreground-darker);
  }

  .summary-value {
    font-size: 1.4rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--color-foreground);
    line-height: 1.1;
  }

  .summary-time {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-foreground-darker);
    margin-inline-start: 4px;
  }

  .flame {
    margin-inline-end: 4px;
    font-size: 1.1rem;
  }

  .streak-none {
    font-size: 0.9rem;
    font-weight: 400;
    color: var(--color-foreground-darker);
    opacity: 0.7;
  }

  /* ── Chart section ───────────────────────────────────────── */
  .chart-section {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
  }

  .chart-wrap {
    display: flex;
    justify-content: center;
  }

  .chart {
    display: block;
    overflow: visible;
  }

  .bar {
    fill: var(--color-focus-round);
    opacity: 0.75;
    transition: opacity 0.15s ease;
    animation: bar-grow 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: var(--bar-delay, 0ms);
  }

  .bar:hover {
    opacity: 1;
  }

  .bar-today {
    fill: var(--color-accent);
    opacity: 0.9;
  }

  .bar-empty {
    fill: color-mix(in oklch, var(--color-foreground) 8%, transparent);
    animation: none;
  }

  @keyframes bar-grow {
    from {
      transform: scaleY(0);
      transform-origin: bottom;
    }
    to {
      transform: scaleY(1);
      transform-origin: bottom;
    }
  }

  .count-label {
    fill: var(--color-foreground);
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .day-label {
    fill: var(--color-foreground-darker);
    font-size: 11px;
    font-weight: 500;
    cursor: default;
  }

  .day-label-today {
    fill: var(--color-accent);
    font-weight: 700;
  }

  .baseline {
    stroke: var(--color-separator);
    stroke-width: 1;
  }

  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 140px;
    color: var(--color-foreground-darker);
    opacity: 0.6;
    font-size: 0.85rem;
    font-style: italic;
  }
</style>
