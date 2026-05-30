<template>
  <Card padding-class="p-4">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div v-if="$slots.default" class="min-w-0 flex-1">
        <slot />
      </div>

      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </Card>
</template>
