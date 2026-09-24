<script lang="ts">
  import type { DailyStats, WorkSummary } from '$lib/types';
  import * as m from '$paraglide/messages.js';
  import { getLocale } from '$paraglide/runtime.js';
  import { toPersianDigits, formatWorkDuration } from '$lib/utils/jalali';

  let { today, summary = null }: { today: DailyStats | null; summary?: WorkSummary | null } =
    $props();

  const isPersian = $derived(getLocale() === 'fa');

  const CHART_H = 80; // px, max bar height in the hourly chart
  const CHART_W = 744; // px, total SVG width for 24 bars
  const BAR_W = 22; // px per bar
  const BAR_GAP = 9; // px between bars

  function fmtTime(mins: number): string {
    if (mins < 60) {
      return isPersian ? `${toPersianDigits(mins)} دقیقه` : `${mins}m`;
    }
    const h = Math.floor(mins / 60);
    const mRem = mins % 60;
    if (isPersian) {
      return mRem === 0
        ? `${toPersianDigits(h)} ساعت`
        : `${toPersianDigits(h)} س ${toPersianDigits(mRem)} د`;
    }
    return mRem === 0 ? `${h}h` : `${h}h ${mRem}m`;
  }

  function fmtSecs(secs: number): string {
    return formatWorkDuration(secs, isPersian);
  }

  function fmtVal(n: number | string | undefined | null): string {
    if (n === undefined || n === null) return '—';
    return isPersian ? toPersianDigits(n) : String(n);
  }

  function fmtRate(rate: number | null): string {
    if (rate === null) return '—';
    const percent = Math.round(rate * 100);
    return isPersian ? `${toPersianDigits(percent)}٪` : `${percent}%`;
  }

  const byHour = $derived(today?.by_hour ?? Array(24).fill(0));
  const maxHour = $derived(Math.max(1, ...byHour));
  const hasData = $derived(today !== null && today.rounds > 0);

  // Hour labels: show every 6 hours
  const hourLabels = [0, 6, 12, 18];

  function getHourLabel(h: number): string {
    if (isPersian) {
      if (h === 0) return '۱۲ ق.ظ';
      if (h === 12) return '۱۲ ب.ظ';
      return h < 12 ? `${toPersianDigits(h)} ق.ظ` : `${toPersianDigits(h - 12)} ب.ظ`;
    }
    return h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`;
  }
</script>

<div class="view">
  <!-- Work summary bar (Day / Week / Month) -->
  {#if summary}
    <div class="summary-bar">
      <div class="summary-pill">
        <span class="pill-label">{m.stats_work_today()}</span>
        <span class="pill-value">{fmtSecs(summary.today_work_secs)}</span>
        <span class="pill-sub">({fmtVal(summary.today_rounds)} {m.stats_rounds().toLowerCase()})</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-pill">
        <span class="pill-label">{m.stats_work_week()}</span>
        <span class="pill-value">{fmtSecs(summary.week_work_secs)}</span>
        <span class="pill-sub">({fmtVal(summary.week_rounds)} {m.stats_rounds().toLowerCase()})</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-pill">
        <span class="pill-label">{m.stats_work_month()}</span>
        <span class="pill-value">{fmtSecs(summary.month_work_secs)}</span>
        <span class="pill-sub">({fmtVal(summary.month_rounds)} {m.stats_rounds().toLowerCase()})</span>
      </div>
    </div>
  {/if}

  <!-- Stat cards -->
  <div class="cards">
    <div class="card" style="--delay: 0ms">
      <span class="card-label">{m.stats_rounds()}</span>
      <span class="card-value">{fmtVal(today?.rounds)}</span>
    </div>
    <div class="card-divider"></div>
    <div class="card" style="--delay: 60ms">
      <span class="card-label">{m.stats_focus_time()}</span>
      <span class="card-value">{today ? fmtTime(today.focus_mins) : '—'}</span>
    </div>
    <div class="card-divider"></div>
    <div class="card" style="--delay: 120ms">
      <span class="card-label">{m.stats_completion()}</span>
      <span class="card-value">{today ? fmtRate(today.completion_rate) : '—'}</span>
    </div>
  </div>

  <!-- Hourly breakdown -->
  <div class="section">
    <div class="section-header">
      <span class="section-title">{m.stats_sessions_by_hour()}</span>
      {#if !hasData}
        <span class="empty-hint">{m.stats_no_sessions_today()}</span>
      {/if}
    </div>

    <div class="chart-wrap">
      <svg
        width={CHART_W}
        height={CHART_H + 28}
        viewBox="0 0 {CHART_W} {CHART_H + 28}"
        class="chart"
      >
        {#each byHour as count, h}
          {@const barH = Math.max(2, Math.round((count / maxHour) * CHART_H))}
          {@const x = h * (BAR_W + BAR_GAP)}
          {@const y = CHART_H - barH}

          <!-- Bar -->
          <rect
            {x}
            {y}
            width={BAR_W}
            height={barH}
            rx="2"
            class="bar"
            class:bar-empty={count === 0}
            style="--bar-scale: {barH / CHART_H}; --bar-delay: {h * 18}ms"
          />

          <!-- Hour label (every 6 hours) -->
          {#if hourLabels.includes(h)}
            <text x={x + BAR_W / 2} y={CHART_H + 18} text-anchor="middle" class="hour-label"
              >{getHourLabel(h)}</text
            >
          {/if}
        {/each}

        <!-- Baseline -->
        <line x1="0" y1={CHART_H} x2={CHART_W} y2={CHART_H} class="baseline" />
      </svg>
    </div>
  </div>
</div>

<style>
  .view {
    display: flex;
    flex-direction: column;
    gap: 0;
    height: 100%;
    padding: 0;
    animation: app-fade-in 0.2s ease;
  }

  /* ── Work summary bar ────────────────────────────────────────── */
  .summary-bar {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 12px 16px;
    background: color-mix(in oklch, var(--color-foreground) 4%, transparent);
    border-bottom: 1px solid var(--color-separator);
    animation: card-rise 0.3s ease both;
  }

  .summary-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    flex: 1;
    text-align: center;
  }

  .pill-label {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-foreground-darker);
  }

  .pill-value {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--color-foreground);
    line-height: 1.2;
  }

  .pill-sub {
    font-size: 0.68rem;
    color: var(--color-foreground-darker);
    opacity: 0.85;
  }

  .summary-divider {
    width: 1px;
    height: 28px;
    background: var(--color-separator);
  }

  /* ── Stat cards ──────────────────────────────────────────── */
  .cards {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--color-separator);
  }

  .card {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 22px 20px;
    animation: card-rise 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: var(--delay, 0ms);
  }

  @keyframes card-rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .card-label {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-foreground-darker);
  }

  .card-value {
    font-size: 2.2rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    color: var(--color-foreground);
    line-height: 1;
  }

  .card-divider {
    width: 1px;
    background: var(--color-separator);
    align-self: stretch;
    margin: 12px 0;
  }

  /* ── Section / chart ─────────────────────────────────────── */
  .section {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-foreground-darker);
  }

  .empty-hint {
    font-size: 0.75rem;
    color: var(--color-foreground-darker);
    opacity: 0.6;
    font-style: italic;
  }

  /* ── Hourly chart ────────────────────────────────────────── */
  .chart-wrap {
    overflow-x: auto;
    overflow-y: hidden;
  }

  .chart {
    display: block;
  }

  .bar {
    fill: var(--color-focus-round);
    opacity: 0.85;
    transform-origin: bottom;
    transform-box: fill-box;
    animation: bar-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: var(--bar-delay, 0ms);
  }

  @keyframes bar-rise {
    from {
      transform: scaleY(0.05);
      opacity: 0;
    }
    to {
      transform: scaleY(1);
      opacity: 0.85;
    }
  }

  .bar-empty {
    fill: color-mix(in oklch, var(--color-foreground) 8%, transparent);
    animation: none;
  }

  .hour-label {
    fill: var(--color-foreground-darker);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
    cursor: default;
  }

  .baseline {
    stroke: var(--color-separator);
    stroke-width: 1;
  }
</style>
