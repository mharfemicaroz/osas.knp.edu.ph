import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";

import "./assets/tailwind.css";
import "@mdi/font/css/materialdesignicons.min.css";

const app = createApp(App);

document.title = import.meta.env.VITE_APP_TITLE || "Default Title";

app.use(router);
app.use(createPinia());

app.mount("#app");
