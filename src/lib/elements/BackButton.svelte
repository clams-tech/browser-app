<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import caret from '$lib/icons/caret'
</script>

<div
  on:click
  class="fixed top-0 z-10 left-0 flex items-center p-4 cursor-pointer font-bold text-inherit"
>
  <div class="w-7 cursor-pointer rotate-90">
    {@html caret}
  </div>
  <span>{$translate('app.buttons.back')}</span>
</div>
