<script lang="ts">
  import warning from '$lib/icons/warning'
  import close from '$lib/icons/close'
  import { fade } from 'svelte/transition'
  export let message = ''
  export let closable = true
</script>

{#if message}
  <div
    in:fade
    class="pl-6 pr-8 w-full max-w-sm py-4 rounded-lg border flex justify-center items-start border-utility-error/50 relative bg-utility-error/5 text-utility-error mt-6 overflow-hidden transition-all"
  >
    {#if closable}
      <div
        on:click={() => (message = '')}
        class="absolute top-0 right-0 w-7 text-utility-error/50 cursor-pointer flex-shrink-0"
      >
        {@html close}
      </div>
    {/if}

    <div class="text-utility-error w-6 flex-shrink-0 mr-4">
      {@html warning}
    </div>

    <span>
      {message}
    </span>
  </div>
{/if}
