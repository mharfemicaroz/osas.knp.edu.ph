<template>
    <div class="min-h-screen relative overflow-hidden">
        <div class="absolute inset-0">
            <div class="h-full w-full bg-cover bg-center" :style="`background-image:url(/images/bg.jpg)`"></div>
            <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
            <div class="absolute inset-0 backdrop-blur-sm"></div>
            <div
                class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,.08),_transparent_40%),radial-gradient(circle_at_80%_0,_rgba(255,255,255,.06),_transparent_35%),radial-gradient(circle_at_50%_100%,_rgba(255,255,255,.05),_transparent_45%)]">
            </div>
        </div>

        <div v-if="auth.isLoading" class="absolute inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-md">
            <div class="loader"></div>
        </div>

        <div class="relative z-10 min-h-screen flex items-center justify-center p-4">
            <div class="w-full max-w-md">
                <div class="mb-6 text-center">
                    <a href="index.html" class="inline-flex items-center justify-center">
                        <img src="/images/logo.png" alt="OSAS" class="h-14 w-auto" />
                    </a>
                    <h1 class="mt-4 text-2xl font-extrabold tracking-wide text-white">
                        Office of Student Affairs & Services
                    </h1>
                    <p class="mt-1 text-primary-text/90 text-sm">Serve. Support. Empower.</p>
                </div>

                <div
                    class="group rounded-2xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl ring-1 ring-black/5 hover:ring-black/10 transition">
                    <div class="p-6 sm:p-7">
                        <div class="mb-5 text-center">
                            <div class="inline-flex items-center gap-2">
                                <span class="inline-grid h-8 w-8 place-items-center rounded-full bg-primary/10">
                                    <i class="mdi mdi-account-key text-primary text-xl"></i>
                                </span>
                                <h2 class="text-lg font-bold text-gray-900">Sign In</h2>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">Use your email and password</p>
                        </div>

                        <form @submit.prevent="onSubmit" class="space-y-4" novalidate>
                            <input type="text" v-model="honeypot" class="hidden" tabindex="-1" autocomplete="off"
                                aria-hidden="true" />

                            <div class="relative">
                                <label class="sr-only">Email</label>
                                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <i class="mdi mdi-email-outline text-gray-400 text-xl"></i>
                                </div>
                                <input
                                    class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                    type="email" required placeholder="Email" v-model.trim="email"
                                    autocomplete="email" />
                            </div>

                            <div class="space-y-2">
                                <div class="relative">
                                    <label class="sr-only">Password</label>
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <i class="mdi mdi-lock-outline text-gray-400 text-xl"></i>
                                    </div>
                                    <input :type="showPassword ? 'text' : 'password'"
                                        class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-11 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                        required placeholder="Password" v-model="password" @keyup="detectCaps($event)"
                                        autocomplete="current-password" />
                                    <button type="button" @click="showPassword = !showPassword"
                                        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                                        <i
                                            :class="showPassword ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                                    </button>
                                </div>
                                <div v-if="capsOn" class="flex items-center gap-2 text-amber-600 text-xs">
                                    <i class="mdi mdi-alert"></i>
                                    <span>Caps Lock is ON</span>
                                </div>
                            </div>

                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <label class="text-sm font-medium text-gray-700">Captcha</label>
                                    <button type="button" @click="genCaptcha"
                                        class="text-xs text-primary hover:underline inline-flex items-center gap-1">
                                        <i class="mdi mdi-refresh"></i>
                                        Refresh
                                    </button>
                                </div>
                                <div class="flex items-center gap-3">
                                    <div class="flex-1">
                                        <div
                                            class="w-full rounded-xl border border-gray-300/80 bg-white/70 px-3 py-2.5 text-gray-900 flex items-center justify-between">
                                            <span class="text-sm select-none">{{ captchaA }} + {{ captchaB }} =</span>
                                            <input class="ml-3 w-24 text-right bg-transparent focus:outline-none"
                                                inputmode="numeric" pattern="[0-9]*" placeholder="Answer"
                                                v-model.trim="captchaInput" />
                                        </div>
                                    </div>
                                    <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg"
                                        :class="captchaStateClass">
                                        <i :class="captchaIconClass"></i>
                                    </span>
                                </div>
                                <p v-if="captchaError" class="text-xs text-red-600">{{ captchaError }}</p>
                            </div>

                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-700">&nbsp;</span>
                                <button type="button" class="text-sm text-primary hover:underline"
                                    @click="forgotPassword">
                                    Forgot password?
                                </button>
                            </div>

                            <div class="pt-1">
                                <button
                                    class="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-semibold tracking-wide shadow-md hover:shadow-lg hover:bg-tertiary transition disabled:opacity-60 disabled:cursor-not-allowed"
                                    type="submit" :disabled="!canSubmit || auth.isLoading">
                                    <span class="inline-flex items-center justify-center gap-2">
                                        <i class="mdi mdi-login-variant"></i>
                                        <span>Log In</span>
                                    </span>
                                </button>
                            </div>


                            <div class="text-center text-xs mt-3">
                                <router-link to="/register" class="text-primary hover:underline">
                                    Don't have an account? <span class="font-semibold">Register</span>
                                </router-link>
                            </div>
                        </form>
                    </div>

                    <div class="px-6 sm:px-7 pb-6">
                        <div class="flex items-center justify-between text-[11px] text-gray-500">
                            <span>OSAS Kiosk v1.0</span>
                            <span>© {{ new Date().getFullYear() }} Student Services</span>
                        </div>
                    </div>
                </div>

                <div class="mt-6 text-center text-xs text-gray-300">
                    <p>By signing in, you agree to our Student Portal Guidelines.</p>
                </div>
            </div>
        </div>

        <ToasterComponent ref="toast" />
    </div>
</template>

<script>
import ToasterComponent from "../components/ToasterComponent.vue";
import { useAuthStore } from "@/stores/auth";

export default {
    data() {
        return {
            email: "",
            password: "",
            showPassword: false,
            capsOn: false,
            captchaA: 0,
            captchaB: 0,
            captchaInput: "",
            captchaError: "",
            honeypot: ""
        };
    },
    computed: {
        auth() {
            return useAuthStore();
        },
        captchaAnswer() {
            return this.captchaA + this.captchaB;
        },
        captchaValid() {
            return String(parseInt(this.captchaInput || "NaN", 10)) === String(this.captchaAnswer);
        },
        captchaStateClass() {
            if (!this.captchaInput) return "bg-gray-100 text-gray-400 border border-gray-200";
            return this.captchaValid ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200";
        },
        captchaIconClass() {
            if (!this.captchaInput) return "mdi mdi-help-circle-outline text-xl";
            return this.captchaValid ? "mdi mdi-check-bold text-xl" : "mdi mdi-close-thick text-xl";
        },
        canSubmit() {
            return this.email.trim().length > 0 && this.password.length > 0 && this.captchaValid && !this.honeypot;
        },
    },
    methods: {
        async onSubmit() {
            if (this.honeypot) return;
            if (!this.captchaValid) {
                this.captchaError = "Incorrect captcha answer.";
                return;
            }
            this.captchaError = "";
            try {
                const res = await this.auth.login(this.email, this.password);
                if (res?.requiresVerification || this.auth.requiresVerification) {
                    this.$refs.toast.showToast("info", "Please verify your email before logging in.");
                    this.$router.push({ name: "verify-prompt", query: { email: this.email } });
                    return;
                }
                if (res?.requires2FA) return;
                this.$refs.toast.showToast("success", "Login successful!");
            } catch (error) {
                this.$refs.toast.showToast("warning", error.message || "Invalid login credentials!");
                this.genCaptcha();
                this.captchaInput = "";
            }
        },
        forgotPassword() {
            this.$refs.toast.showToast("info", "Please contact support to reset your password.");
        },
        detectCaps(e) {
            if (e.getModifierState) this.capsOn = e.getModifierState("CapsLock");
        },
        genCaptcha() {
            const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
            this.captchaA = r(10, 49);
            this.captchaB = r(10, 49);
            this.captchaInput = "";
            this.captchaError = "";
        },
    },
    components: { ToasterComponent },
    created() {
        this.genCaptcha();
    }
};
</script>

<style scoped>
.loader {
    border: 4px solid #f3f3f3;
    border-top: 4px solid var(--accent);
    border-radius: 50%;
    width: 42px;
    height: 42px;
    animation: spin 0.9s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
