<script setup>
import { mdiCog } from '@mdi/js'
import { useSlots, computed } from 'vue'
import BaseIcon from '@/components/commons/BaseIcon.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import IconRounded from '@/components/commons/IconRounded.vue'

defineProps({
    icon: {
        type: String,
        default: null
    },
    title: {
        type: String,
        required: true
    },
    main: Boolean
})

const hasSlot = computed(() => useSlots().default)
</script>

<template>
    <!-- Use flex-col on mobile and flex-row on larger screens -->
    <section :class="{ 'pt-6': !main }" class="mb-6 flex flex-col sm:flex-row items-center justify-between">
        <div class="flex items-center justify-start mb-4 sm:mb-0">
            <!-- Display rounded icon if main and icon provided -->
            <IconRounded v-if="icon && main" :icon="icon" color="light" class="mr-3" bg />
            <!-- Otherwise, show the simple icon if available -->
            <BaseIcon v-else-if="icon" :path="icon" class="mr-2" size="20" />
            <h1 :class="main ? 'text-3xl' : 'text-2xl'" class="leading-tight">
                {{ title }}
            </h1>
        </div>
        <!-- Wrap the slot (or fallback) in its own container -->
        <div class="flex-shrink-0">
            <slot>
                <BaseButton :icon="mdiCog" color="whiteDark" />
            </slot>
        </div>
    </section>
</template>
