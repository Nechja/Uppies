<script lang="ts">
  import { THEME_LABELS, applyTheme, getSavedTheme } from '../lib/theme.ts'
  import type { Theme } from '../lib/types.ts'

  type Props = { themes: ReadonlyArray<string> }
  let { themes }: Props = $props()

  let current = $state<Theme>(getSavedTheme(themes, themes[0] as Theme))
  let open = $state(false)

  function select(theme: Theme) {
    current = theme
    applyTheme(theme)
    open = false
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (!target.closest('.theme-picker')) open = false
  }
</script>

<svelte:document onclick={handleClickOutside} />

<div class="theme-picker">
  <button class="trigger" onclick={() => { open = !open }} aria-expanded={open}>
    {THEME_LABELS[current] ?? current}
  </button>
  {#if open}
    <div class="dropdown">
      {#each themes as themeId (themeId)}
        {@const label = THEME_LABELS[themeId as Theme] ?? themeId}
        <button
          class="dropdown-item"
          class:active={current === themeId}
          onclick={() => select(themeId as Theme)}
        >
          {label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .theme-picker {
    position: relative;
  }

  .trigger {
    background: none;
    border: 1px solid var(--upp-color-border-subtle);
    color: var(--upp-color-text-secondary);
    font-family: var(--upp-font-family-ui);
    font-size: var(--upp-font-size-xs);
    padding: var(--upp-spacing-1) var(--upp-spacing-3);
    border-radius: var(--upp-radius-full);
    cursor: pointer;
    transition: all var(--upp-transition-fast);
    white-space: nowrap;
  }

  .trigger:hover,
  .trigger[aria-expanded='true'] {
    border-color: var(--upp-color-accent-primary);
    color: var(--upp-color-accent-primary);
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    display: flex;
    flex-direction: column;
    min-width: 140px;
    background: var(--upp-color-bg-raised);
    border: 1px solid var(--upp-color-border-default);
    border-radius: var(--upp-radius-md);
    padding: var(--upp-spacing-1) 0;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .dropdown-item {
    background: none;
    border: none;
    color: var(--upp-color-text-secondary);
    font-family: var(--upp-font-family-ui);
    font-size: var(--upp-font-size-sm);
    padding: var(--upp-spacing-2) var(--upp-spacing-4);
    text-align: left;
    cursor: pointer;
    transition: all var(--upp-transition-fast);
  }

  .dropdown-item:hover {
    background: var(--upp-color-bg-surface);
    color: var(--upp-color-text-primary);
  }

  .dropdown-item.active {
    color: var(--upp-color-accent-primary);
  }
</style>
