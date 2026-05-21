<template>
  <div class="grid items-start gap-3 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[21rem_minmax(0,1fr)]">
    <aside class="min-w-0 space-y-3">
      <slot name="side" />
    </aside>

    <section class="min-w-0 space-y-3">
      <slot />
    </section>
  </div>
</template>
