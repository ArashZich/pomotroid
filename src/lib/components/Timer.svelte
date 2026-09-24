<script lang="ts">
  // Orchestrator component. Subscribes to timer events, owns keyboard listener,
  // and renders TimerDial + TimerDisplay + TimerFooter.
  import { onMount } from 'svelte';
  import {
    timerToggle,
    timerRestartRound,
    timerSkip,
    getTimerState,
    onTimerTick,
    onTimerPaused,
    onTimerResumed,
    onRoundChange,
    onTimerReset,
  } from '$lib/ipc';
  import { timerState } from '$lib/stores/timer';
  import { settings } from '$lib/stores/settings';
  import { fade } from 'svelte/transition';
  import TimerDial from './TimerDial.svelte';
  import TimerDisplay from './TimerDisplay.svelte';
  import TimerFooter from './TimerFooter.svelte';
  import MiniControls from './MiniControls.svelte';
  import Tooltip from './Tooltip.svelte';
  import type { UnlistenFn } from '@tauri-apps/api/event';
  import * as m from '$paraglide/messages.js';
  import { notificationShow, statsGetWorkSummary, onSessionsCleared } from '$lib/ipc';
  import { openBreakShield, closeBreakShield } from '$lib/utils/breakShield';
  import { getLocale } from '$paraglide/runtime.js';
  import { formatWorkDuration } from '$lib/utils/jalali';
  import type { WorkSummary } from '$lib/types';

  interface Props {
    isCompact?: boolean;
    uiScale?: number;
  }

  let { isCompact = false, uiScale = 1 }: Props = $props();

  let snap = $derived($timerState);

  function roundColor(rt: string): string {
    if (rt === 'work') return 'var(--color-focus-round)';
    if (rt === 'short-break') return 'var(--color-short-round)';
    return 'var(--color-long-round)';
  }

  function roundLabel(rt: string): string {
    if (rt === 'work') return m.round_label_work();
    if (rt === 'short-break') return m.round_label_short_break();
    return m.round_label_long_break();
  }

  let workSummary = $state<WorkSummary | null>(null);

  const isPersian = $derived(getLocale() === 'fa');

  // Compute live today total work seconds:
  const liveTodaySecs = $derived.by(() => {
    const base = workSummary?.today_work_secs ?? 0;
    if (snap.round_type === 'work' && snap.is_running) {
      return base + snap.elapsed_secs;
    }
    return base;
  });

  const todayFmt = $derived(formatWorkDuration(liveTodaySecs, isPersian));
  const weekFmt = $derived(formatWorkDuration(workSummary?.week_work_secs ?? 0, isPersian));
  const monthFmt = $derived(formatWorkDuration(workSummary?.month_work_secs ?? 0, isPersian));
  const summaryTooltip = $derived(
    `${m.stats_work_today()}: ${todayFmt} • ${m.stats_work_week()}: ${weekFmt} • ${m.stats_work_month()}: ${monthFmt}`
  );

  async function refreshSummary() {
    try {
      workSummary = await statsGetWorkSummary();
    } catch {
      // ignore
    }
  }

  onMount(() => {
    const cleanups: UnlistenFn[] = [];

    // Async setup: hydrate state and register event listeners.
    (async () => {
      const initial = await getTimerState();
      timerState.set(initial);
      await refreshSummary();

      cleanups.push(
        await onSessionsCleared(refreshSummary),
        await onTimerTick(({ elapsed_secs, total_secs }) => {
          timerState.update((s) => ({
            ...s,
            elapsed_secs,
            total_secs,
            is_running: true,
            is_paused: false,
          }));
        }),
        await onTimerPaused(({ elapsed_secs }) => {
          timerState.update((s) => ({
            ...s,
            elapsed_secs,
            is_running: false,
            is_paused: true,
          }));
        }),
        await onTimerResumed(({ elapsed_secs }) => {
          timerState.update((s) => ({
            ...s,
            elapsed_secs,
            is_running: true,
            is_paused: false,
          }));
        }),
        await onRoundChange((snap) => {
          timerState.set(snap);
          refreshSummary();
          if (snap.round_type === 'short-break' || snap.round_type === 'long-break') {
            if ($settings.fullscreen_break_shield) {
              openBreakShield();
            }
          } else {
            closeBreakShield();
          }

          if ($settings.notifications_enabled) {
            let title: string;
            let body: string;
            if (snap.round_type === 'work') {
              const afterBreak =
                snap.previous_round_type === 'short-break' ||
                snap.previous_round_type === 'long-break';
              title = afterBreak ? m.notification_work_title() : m.notification_work_start_title();
              body = afterBreak ? m.notification_work_body() : m.notification_work_start_body();
            } else if (snap.round_type === 'short-break') {
              title = m.notification_short_break_title();
              body = m.notification_short_break_body();
            } else {
              title = m.notification_long_break_title();
              body = m.notification_long_break_body();
            }
            notificationShow(title, body).catch(() => {});
          }
        }),
        await onTimerReset((snap) => {
          timerState.set(snap);
          refreshSummary();
          closeBreakShield();
        })
      );
    })();

    return () => {
      for (const unlisten of cleanups) unlisten();
    };
  });
</script>

<div class="timer-outer" class:compact={isCompact}>
  <div class="timer" style="zoom: {uiScale}">
    <!-- Dial + display stacked (display centered over dial) -->
    <div class="dial-stack">
      <TimerDial {snap} countdown={$settings.dial_countdown} />
      <TimerDisplay state={snap} />
    </div>

    {#if !isCompact}
      <!-- Round type label sits below the dial as a normal flex child so it
           does not affect the dial-stack height used to centre TimerDisplay. -->
      <div class="round-label" style="color: {roundColor(snap.round_type)}">
        {roundLabel(snap.round_type)}
      </div>

      <div class="controls-wrapper">
        <!-- Back: restart current round -->
        <Tooltip text={m.tooltip_restart_round()}>
          <button class="btn-side" onclick={timerRestartRound} aria-label="Restart round">
            <svg width="18" height="18" viewBox="0 0 16 16">
              <polygon points="15,1 6,8 15,15" fill="currentColor" />
              <rect x="1" y="1" width="3" height="14" rx="1" fill="currentColor" />
            </svg>
          </button>
        </Tooltip>

        <!-- Play / Pause — icon fades when state changes -->
        <button
          class="play-pause"
          onclick={timerToggle}
          aria-label={snap.is_running ? 'Pause' : 'Play'}
        >
          {#key snap.is_running}
            <span class="icon" in:fade={{ duration: 120 }}>
              {#if snap.is_running}
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <rect x="5" y="3" width="5" height="18" rx="1.5" fill="currentColor" />
                  <rect x="14" y="3" width="5" height="18" rx="1.5" fill="currentColor" />
                </svg>
              {:else}
                <svg width="18" height="18" viewBox="0 0 24 24" style="overflow: visible;">
                  <polygon points="4,0 28,12 4,24" fill="currentColor" />
                </svg>
              {/if}
            </span>
          {/key}
        </button>

        <!-- Skip: advance to next round -->
        <Tooltip text={m.tooltip_skip()}>
          <button class="btn-side" onclick={timerSkip} aria-label="Skip round">
            <svg width="18" height="18" viewBox="0 0 16 16">
              <polygon points="1,1 10,8 1,15" fill="currentColor" />
              <rect x="12" y="1" width="3" height="14" rx="1" fill="currentColor" />
            </svg>
          </button>
        </Tooltip>

        <TimerFooter {snap} />
      </div>

      {#if liveTodaySecs > 0}
        <div class="today-work-pill" title={summaryTooltip}>
          <span class="pill-dot"></span>
          <span class="pill-text">{m.timer_today_total({ time: todayFmt })}</span>
        </div>
      {/if}
    {/if}
  </div>

  {#if isCompact}
    <MiniControls />
  {/if}
</div>

<style>
  .today-work-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: color-mix(in oklch, var(--color-foreground) 6%, transparent);
    border-radius: 12px;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--color-foreground-darker);
    cursor: default;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .today-work-pill:hover {
    background: color-mix(in oklch, var(--color-foreground) 10%, transparent);
    color: var(--color-foreground);
  }

  .pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-focus-round);
    flex-shrink: 0;
  }

  .pill-text {
    line-height: 1;
  }

  .timer-outer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .timer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .dial-stack {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .controls-wrapper {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px 12px;
  }
  .controls-wrapper > :global(*) {
    aspect-ratio: 1;
  }

  .btn-side {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-foreground-darker, var(--color-foreground));
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 4px;
    transition:
      color var(--transition-default),
      background var(--transition-default);
  }

  .btn-side:hover {
    color: var(--color-foreground);
    background: var(--color-hover);
  }

  .play-pause {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-foreground);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid var(--color-foreground-darker, var(--color-foreground));
    transition:
      color var(--transition-default),
      border-color var(--transition-default),
      background var(--transition-default);
    overflow: hidden; /* clip the fading icon within the circle */
  }

  .play-pause:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
    background: var(--color-hover);
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .round-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    /* Collapse the gap above: the flex gap already provides spacing from the dial. */
    margin-top: -8px;
  }
</style>
