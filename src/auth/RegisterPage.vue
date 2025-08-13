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
                                    <i class="mdi mdi-account-plus text-primary text-xl"></i>
                                </span>
                                <h2 class="text-lg font-bold text-gray-900">Create Account</h2>
                            </div>
                            <p class="text-xs text-gray-500 mt-2">Fill in the details to register</p>
                        </div>

                        <form @submit.prevent="onSubmit" class="space-y-4" novalidate>
                            <input type="text" v-model="honeypot" class="hidden" tabindex="-1" autocomplete="off"
                                aria-hidden="true" />

                            <div class="space-y-1">
                                <div class="relative">
                                    <label class="sr-only">Username</label>
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <i class="mdi mdi-account-outline text-gray-400 text-xl"></i>
                                    </div>
                                    <input
                                        class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                        type="text" required placeholder="Username" v-model.trim="username"
                                        autocomplete="username" />
                                </div>
                                <p v-if="username && !usernameValid" class="text-xs text-rose-600">
                                    Username must be 4–20 characters and use letters, numbers, dot, underscore, or
                                    hyphen.
                                </p>
                            </div>

                            <div class="space-y-1">
                                <div class="relative">
                                    <label class="sr-only">Email</label>
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <i class="mdi mdi-email-outline text-gray-400 text-xl"></i>
                                    </div>
                                    <input
                                        class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                        type="email" required placeholder="Email (must be @knp.edu.ph)"
                                        v-model.trim="email" autocomplete="email" />
                                </div>
                                <p v-if="email && !validEmailDomain" class="text-xs text-rose-600">Email must end with
                                    @knp.edu.ph</p>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div class="space-y-1">
                                    <div class="relative">
                                        <label class="sr-only">First name</label>
                                        <div
                                            class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <i class="mdi mdi-card-account-details-outline text-gray-400 text-xl"></i>
                                        </div>
                                        <input
                                            class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                            type="text" required placeholder="First name" v-model.trim="first_name"
                                            autocomplete="given-name" />
                                    </div>
                                    <p v-if="first_name === '' && triedSubmit" class="text-xs text-rose-600">First name
                                        is required.</p>
                                </div>

                                <div class="space-y-1">
                                    <div class="relative">
                                        <label class="sr-only">Last name</label>
                                        <div
                                            class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <i class="mdi mdi-card-account-details text-gray-400 text-xl"></i>
                                        </div>
                                        <input
                                            class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                            type="text" required placeholder="Last name" v-model.trim="last_name"
                                            autocomplete="family-name" />
                                    </div>
                                    <p v-if="last_name === '' && triedSubmit" class="text-xs text-rose-600">Last name is
                                        required.</p>
                                </div>
                            </div>

                            <input type="hidden" v-model="role" />

                            <div class="space-y-2">
                                <div class="relative">
                                    <label class="sr-only">Password</label>
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <i class="mdi mdi-lock-outline text-gray-400 text-xl"></i>
                                    </div>
                                    <input :type="showPassword ? 'text' : 'password'"
                                        class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-11 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                        required placeholder="Password" v-model="password"
                                        @keyup="capsOnPwd = detectCaps($event)" autocomplete="new-password"
                                        minlength="8" />
                                    <button type="button" @click="showPassword = !showPassword"
                                        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                                        <i
                                            :class="showPassword ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                                    </button>
                                </div>
                                <div v-if="capsOnPwd" class="flex items-center gap-2 text-amber-600 text-xs">
                                    <i class="mdi mdi-alert"></i>
                                    <span>Caps Lock is ON</span>
                                </div>
                                <p v-if="password && !passwordValid" class="text-xs text-rose-600">
                                    Password must be at least 8 characters and include letters and numbers.
                                </p>
                            </div>

                            <div class="space-y-2">
                                <div class="relative">
                                    <label class="sr-only">Confirm Password</label>
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <i class="mdi mdi-lock-check-outline text-gray-400 text-xl"></i>
                                    </div>
                                    <input :type="showConfirm ? 'text' : 'password'"
                                        class="w-full rounded-xl border border-gray-300/80 bg-white/70 pl-11 pr-11 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition disabled:opacity-60"
                                        required placeholder="Confirm password" v-model="confirmPassword"
                                        @keyup="capsOnConfirm = detectCaps($event)" autocomplete="new-password"
                                        minlength="8" />
                                    <button type="button" @click="showConfirm = !showConfirm"
                                        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                                        <i :class="showConfirm ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                                    </button>
                                </div>
                                <div v-if="capsOnConfirm" class="flex items-center gap-2 text-amber-600 text-xs">
                                    <i class="mdi mdi-alert"></i>
                                    <span>Caps Lock is ON</span>
                                </div>
                                <p v-if="passwordsDontMatch" class="text-xs text-rose-600">Passwords do not match.</p>
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

                            <div class="pt-1">
                                <button
                                    class="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-semibold tracking-wide shadow-md hover:shadow-lg hover:bg-tertiary transition disabled:opacity-60 disabled:cursor-not-allowed"
                                    type="submit" :disabled="!canSubmit || auth.isLoading">
                                    <span class="inline-flex items-center justify-center gap-2">
                                        <i class="mdi mdi-account-check-outline"></i>
                                        <span>Create Account</span>
                                    </span>
                                </button>
                            </div>

                            <div class="relative my-4">
                                <div class="absolute inset-0 flex items-center">
                                    <span class="w-full border-t border-gray-200"></span>
                                </div>
                                <div class="relative flex justify-center text-xs">
                                    <span class="bg-white/80 px-2 text-gray-500">or sign up with</span>
                                </div>
                            </div>

                            <div>
                                <button type="button"
                                    class="w-full py-2.5 px-4 rounded-xl bg-white text-gray-800 font-semibold tracking-wide border border-gray-300/80 shadow-sm hover:shadow-md hover:bg-gray-50 transition disabled:opacity-60"
                                    :disabled="auth.isLoading" @click="signUpWithSchoolAccount">
                                    <span class="inline-flex items-center justify-center gap-2">
                                        <i class="mdi mdi-google"></i>
                                        <span>Sign up with School Account</span>
                                        <span class="text-xs text-gray-500">(knp.edu.ph)</span>
                                    </span>
                                </button>
                            </div>

                            <div class="text-center text-xs">
                                <router-link to="/login" class="text-primary hover:underline">
                                    Already have an account? Sign in
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
                    <p>By registering, you agree to our Student Portal Guidelines.</p>
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
            email: "",
            first_name: "",
            last_name: "",
            role: "student",
            is_active: 0,
            password: "",
            confirmPassword: "",
            showPassword: false,
            showConfirm: false,
            capsOnPwd: false,
            capsOnConfirm: false,
            triedSubmit: false,
            honeypot: "",
            captchaA: 0,
            captchaB: 0,
            captchaInput: "",
            captchaError: ""
        };
    },
    computed: {
        auth() {
            return useAuthStore();
        },
        usernameValid() {
            return /^[a-zA-Z0-9._-]{4,20}$/.test(this.username);
        },
        validEmailDomain() {
            return /@knp\.edu\.ph$/i.test(this.email);
        },
        passwordValid() {
            return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(this.password);
        },
        passwordsDontMatch() {
            return this.password && this.confirmPassword && this.password !== this.confirmPassword;
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
            return (
                this.usernameValid &&
                this.validEmailDomain &&
                this.first_name.trim().length > 0 &&
                this.last_name.trim().length > 0 &&
                this.passwordValid &&
                !this.passwordsDontMatch &&
                this.captchaValid &&
                !this.honeypot
            );
        },
    },
    methods: {
        async onSubmit() {
            this.triedSubmit = true;
            if (this.honeypot) return;
            if (!this.canSubmit) {
                if (!this.captchaValid) this.captchaError = "Incorrect captcha answer.";
                return;
            }
            this.captchaError = "";
            try {
                const payload = {
                    username: this.username.trim(),
                    email: this.email.trim(),
                    password: this.password,
                    role: this.role,
                    is_active: this.is_active,
                    first_name: this.first_name.trim(),
                    last_name: this.last_name.trim(),
                };

                // store handles email existence check if endpoint is available
                await this.auth.register(payload);

                this.$refs.toast.showToast("success", "Registration successful! Please sign in.");
                this.username = "";
                this.email = "";
                this.first_name = "";
                this.last_name = "";
                this.password = "";
                this.confirmPassword = "";
                this.captchaInput = "";
                this.triedSubmit = false;

                setTimeout(() => {
                    this.$router.push({ name: "login" });
                }, 500);
            } catch (error) {
                const msg = error?.message || "Registration failed";
                this.$refs.toast.showToast("warning", msg);
                this.genCaptcha();
            }
        },
        detectCaps(e) {
            return e.getModifierState ? e.getModifierState("CapsLock") : false;
        },
        genCaptcha() {
            const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
            this.captchaA = r(10, 49);
            this.captchaB = r(10, 49);
            this.captchaInput = "";
            this.captchaError = "";
        },
        signUpWithSchoolAccount() {
            try {
                this.auth.startGoogleLogin("#/register");
            } catch (e) {
                this.$refs.toast.showToast("warning", e.message || "Unable to start Google sign-up");
            }
        },
        tryConsumeSso() {
            try {
                const consumed = this.auth.consumeSsoFromHash();
                if (consumed) this.$refs.toast?.showToast("success", "Signed up with school account");
            } catch (e) {
                this.$refs.toast?.showToast("warning", e.message || "Google sign-up failed");
            }
        }
    },
    components: { ToasterComponent },
    created() {
        this.genCaptcha();
    },
    mounted() {
        // In case SSO redirects back to /register
        this.tryConsumeSso();
        this.$nextTick(() => this.tryConsumeSso());
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
