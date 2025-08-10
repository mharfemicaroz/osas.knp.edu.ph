<template>
    <div class="min-h-screen relative overflow-hidden">
        <!-- Background -->
        <div class="absolute inset-0">
            <div class="h-full w-full bg-cover bg-center" :style="`background-image:url(/images/bg.jpg)`"></div>
            <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
            <div class="absolute inset-0 backdrop-blur-sm"></div>
            <div
                class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,.08),_transparent_40%),radial-gradient(circle_at_80%_0,_rgba(255,255,255,.06),_transparent_35%),radial-gradient(circle_at_50%_100%,_rgba(255,255,255,.05),_transparent_45%)]">
            </div>
        </div>

        <!-- Loading overlay -->
        <div v-if="auth.isLoading" class="absolute inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-md">
            <div class="loader"></div>
        </div>

        <div class="relative z-10 min-h-screen flex items-center justify-center p-4">
            <div class="w-full max-w-md">
                <div class="mb-6 text-center">
                    <img src="/images/logo.png" alt="OSAS" class="h-14 w-auto mx-auto" />
                    <h1 class="mt-4 text-2xl font-extrabold tracking-wide text-white">Email Verification</h1>
                    <p class="mt-1 text-primary-text/90 text-sm">Secure. Simple. Seamless.</p>
                </div>

                <div
                    class="group rounded-2xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl ring-1 ring-black/5 transition">
                    <div class="p-6 sm:p-7 text-center">
                        <div v-if="state === 'success'" class="space-y-3">
                            <div
                                class="inline-grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 mx-auto">
                                <i class="mdi mdi-check-decagram text-3xl text-emerald-600"></i>
                            </div>
                            <h2 class="text-lg font-bold text-gray-900">Your email is verified!</h2>
                            <p class="text-sm text-gray-600">Redirecting to login in {{ countdown }}s…</p>
                            <button
                                class="mt-2 py-2.5 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-tertiary transition"
                                @click="goLogin">
                                Go to Login now
                            </button>
                        </div>

                        <div v-else-if="state === 'error'" class="space-y-3">
                            <div class="inline-grid h-12 w-12 place-items-center rounded-full bg-rose-500/10 mx-auto">
                                <i class="mdi mdi-alert-circle-outline text-3xl text-rose-600"></i>
                            </div>
                            <h2 class="text-lg font-bold text-gray-900">Verification failed</h2>
                            <p class="text-sm text-gray-600">{{ errorMsg || 'The link may be invalid or expired.' }}</p>
                            <button
                                class="mt-2 py-2.5 px-4 rounded-xl border border-gray-300/80 bg-white/70 font-semibold hover:bg-white transition"
                                @click="retry">
                                Try again
                            </button>
                            <button
                                class="mt-2 ml-2 py-2.5 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-tertiary transition"
                                @click="goLogin">
                                Back to Login
                            </button>
                        </div>

                        <div v-else class="space-y-3">
                            <div class="inline-grid h-12 w-12 place-items-center rounded-full bg-primary/10 mx-auto">
                                <i class="mdi mdi-email-check-outline text-3xl text-primary"></i>
                            </div>
                            <h2 class="text-lg font-bold text-gray-900">Verifying your email…</h2>
                            <p class="text-sm text-gray-600">Please wait a moment.</p>
                        </div>
                    </div>

                    <div class="px-6 sm:px-7 pb-6">
                        <div class="flex items-center justify-between text-[11px] text-gray-500">
                            <span>OSAS Kiosk v1.0</span>
                            <span>© {{ new Date().getFullYear() }} Student Services</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <ToasterComponent ref="toast" />
    </div>
</template>

<script>
import { useAuthStore } from "@/stores/auth";
import ToasterComponent from "@/components/ToasterComponent.vue";

export default {
    name: "VerifyingNow",
    components: { ToasterComponent },
    data() {
        return {
            state: "loading", // 'loading' | 'success' | 'error'
            countdown: 3,
            tHandle: null,
            errorMsg: "",
        };
    },
    computed: {
        auth() {
            return useAuthStore();
        },
        token() {
            return this.$route.query.token || "";
        },
    },
    methods: {
        async verify() {
            if (!this.token) {
                this.state = "error";
                this.errorMsg = "Missing verification token.";
                return;
            }
            try {
                await this.auth.verifyEmail(this.token); // calls GET /auth/verify-email?token=...
                this.state = "success";
                this.$refs.toast?.showToast("success", "Email verified!");
                this.startCountdown();
            } catch (e) {
                this.state = "error";
                this.errorMsg = e.message || "Verification failed.";
                this.$refs.toast?.showToast("warning", this.errorMsg);
            }
        },
        startCountdown() {
            this.tHandle = setInterval(() => {
                if (this.countdown > 0) this.countdown -= 1;
                if (this.countdown === 0) {
                    clearInterval(this.tHandle);
                    this.goLogin();
                }
            }, 1000);
        },
        goLogin() {
            this.$router.replace({ name: "login" });
        },
        retry() {
            this.state = "loading";
            this.errorMsg = "";
            this.verify();
        },
    },
    mounted() {
        this.verify();
    },
    unmounted() {
        if (this.tHandle) clearInterval(this.tHandle);
    },
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
