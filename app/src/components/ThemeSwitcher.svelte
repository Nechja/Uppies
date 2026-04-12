<script lang="ts">
  import { THEME_LABELS, applyTheme, getSavedTheme } from '../lib/theme.ts'
  import type { Theme } from '../lib/types.ts'

  type Props = { themes: ReadonlyArray<string> }
  let { themes }: Props = $props()

  let current = $state<Theme>(getSavedTheme(themes, themes[0] as Theme))

  function select(theme: Theme) {
    current = theme
    applyTheme(theme)
  }
</script>

<div class="switcher" role="group" aria-label="Theme">
  {#each themes as themeId (themeId)}
    {@const label = THEME_LABELS[themeId as Theme] ?? themeId}
    <button
      class="option"
      aria-pressed={current === themeId}
      onclick={() => select(themeId as Theme)}
    >
      {label}
    </button>
  {/each}
</div>

<style>
  .switcher {
    display: flex;
    gap: var(--upp-spacing-1);
  }

  .option {
    background: none;
    border: 1px solid var(--upp-color-border-subtle);
    color: var(--upp-color-text-secondary);
    font-family: var(--upp-font-family-ui);
    font-size: var(--upp-font-size-xs);
    padding: var(--upp-spacing-1) var(--upp-spacing-3);
    border-radius: var(--upp-radius-full);
    cursor: pointer;
    transition: all var(--upp-transition-fast);
  }

  .option[aria-pressed='true'] {
    border-color: var(--upp-color-accent-primary);
    color: var(--upp-color-accent-primary);
    background: var(--upp-color-accent-glow);
  }
</style>
