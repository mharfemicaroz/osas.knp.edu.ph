<script setup>
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'

const calendarId = import.meta.env.VITE_GCAL_ID || 'osas@knp.edu.ph' // paste your Calendar ID or use env
const timeZone = 'Asia/Manila'
const params = new URLSearchParams({
    src: calendarId,
    ctz: timeZone,
    showTitle: '0',
    showNav: '1',
    showDate: '1',
    showTabs: '1',
    showPrint: '0',
    showCalendars: '0',
    mode: 'MONTH', // DAY | WEEK | MONTH | AGENDA
}).toString()
const embedUrl = `https://calendar.google.com/calendar/embed?${params}`
</script>

<template>
    <LayoutAuthenticated>
        <SectionMain>
            <div class="w-full">
                <div class="aspect-[16/10] w-full rounded-xl overflow-hidden shadow">
                    <iframe :src="embedUrl" class="w-full h-full border-0" allowfullscreen />
                </div>
            </div>
        </SectionMain>
    </LayoutAuthenticated>
</template>
