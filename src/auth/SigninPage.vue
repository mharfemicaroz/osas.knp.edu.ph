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

        <div v-if="loading" class="absolute inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-md">
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
                                <h2 class="text-lg font-bold text-gray-900">{{ forgotPassword ? "Reset Password" :
                                    "SignIn" }}</h2>
                            </div>
                            <p class="text-xs text-gray-500 mt-2" v-if="!forgotPassword">Use your Student Number and
                                password</p>
                            <p class="text-xs text-gray-500 mt-2" v-else>Verify your birthdate to reset</p>
                        </div>

                        <form @submit.prevent="forgotPassword ? resetPassword() : login()" class="space-y-4" novalidate>
                            <div class="relative">
                                <label class="sr-only">Student Number</label>
                                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <i class="mdi mdi-card-account-details-outline text-gray-400 text-xl"></i>
                                </div>
                                <input
                                    class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                    type="text" inputmode="numeric" required :readonly="isAuthenticated"
                                    placeholder="Student Number" v-model.trim="username" autocomplete="off" />
                            </div>

                            <div v-if="!forgotPassword" class="space-y-2">
                                <div class="relative">
                                    <label class="sr-only">Password</label>
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <i class="mdi mdi-lock-outline text-gray-400 text-xl"></i>
                                    </div>
                                    <input :type="showPassword ? 'text' : 'password'"
                                        class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-11 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                        required :readonly="isAuthenticated" placeholder="Password" v-model="password"
                                        @keyup="detectCaps($event)" autocomplete="off" />
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

                            <div v-if="forgotPassword" class="space-y-2">
                                <label for="birthdate" class="block text-xs font-medium text-gray-700">Birthdate</label>
                                <input id="birthdate"
                                    class="w-full rounded-xl border border-gray-300/80 bg-white/70 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition"
                                    type="date" required v-model="birthdate" />
                            </div>

                            <div v-if="!forgotPassword" class="flex items-center justify-between">
                                <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                                    <input type="checkbox"
                                        class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
                                        v-model="rememberMe" />
                                    Remember me
                                </label>
                                <button type="button" class="text-sm text-primary hover:underline"
                                    @click="toggleForgotPassword">Forgot password?</button>
                            </div>

                            <div class="pt-1">
                                <button
                                    class="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-semibold tracking-wide shadow-md hover:shadow-lg hover:bg-tertiary transition disabled:opacity-60 disabled:cursor-not-allowed"
                                    type="submit" :disabled="isAuthenticated || !canSubmit">
                                    <span class="inline-flex items-center justify-center gap-2">
                                        <i class="mdi"
                                            :class="forgotPassword ? 'mdi-key-change' : 'mdi-login-variant'"></i>
                                        <span>{{ forgotPassword ? "Reset Password" : "Log In" }}</span>
                                    </span>
                                </button>
                            </div>

                            <div class="text-center">
                                <button type="button" class="text-sm text-primary-text hover:underline"
                                    @click="toggleForgotPassword">
                                    <i class="mdi mdi-lock mr-1"></i>
                                    {{ forgotPassword ? "Back to Sign In" : "Reset Password" }}
                                </button>
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
            username: "",
            password: "",
            birthdate: "",
            isAuthenticated: false,
            loading: false,
            forgotPassword: false,
            showPassword: false,
            capsOn: false,
            rememberMe: false,
        };
    },
    computed: {
        canSubmit() {
            if (this.forgotPassword) {
                return this.username.trim().length > 0 && this.birthdate !== "";
            }
            return this.username.trim().length > 0 && this.password.length > 0;
        },
    },
    methods: {
        async login() {
            const authStore = useAuthStore();
            let authAccess = null;
            try {
                this.loading = true;
                authAccess = await authStore.login(this.username, { password: this.password, remember: this.rememberMe });
            } catch (error) {
                console.error("Error:", error);
            } finally {
                this.loading = false;
                if (authAccess) {
                    this.isAuthenticated = true;
                    this.$refs.toast.showToast("success", "Login successfully!");
                    setTimeout(() => {
                        this.$router.push("/index/dashboard");
                    }, 800);
                } else {
                    this.$refs.toast.showToast("warning", "Invalid login credentials!");
                }
            }
        },
        toggleForgotPassword() {
            this.forgotPassword = !this.forgotPassword;
            this.username = "";
            this.password = "";
            this.birthdate = "";
            this.showPassword = false;
            this.capsOn = false;
        },
        async resetPassword() {
            const authStore = useAuthStore();
            const [year, month, day] = this.birthdate.split("-");
            const formattedBirthdate = `${month}/${day}/${year}`;
            try {
                this.loading = true;
                await authStore.reset({ studentno: this.username, birthday: formattedBirthdate }, { password: "123456" });
                this.$refs.toast.showToast("info", "If all fields are valid, the password is reset to default.");
                this.isAuthenticated = true;
            } catch (e) {
                console.error(e);
                this.$refs.toast.showToast("warning", "Reset failed. Check your details.");
            } finally {
                this.loading = false;
                setTimeout(() => {
                    this.forgotPassword = false;
                    this.isAuthenticated = false;
                }, 900);
            }
        },
        detectCaps(e) {
            if (e.getModifierState) this.capsOn = e.getModifierState("CapsLock");
        },
    },
    components: { ToasterComponent },
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
