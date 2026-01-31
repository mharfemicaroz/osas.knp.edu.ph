<template>
    <div class="min-h-screen relative overflow-hidden">
        <!-- Background layers -->
        <div class="absolute inset-0">
            <div class="h-full w-full bg-cover bg-center" :style="`background-image:url(/images/bg.jpg)`"></div>
            <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
            <div class="absolute inset-0 backdrop-blur-sm"></div>
            <div
                class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,.08),_transparent_40%),radial-gradient(circle_at_80%_0,_rgba(255,255,255,.06),_transparent_35%),radial-gradient(circle_at_50%_100%,_rgba(255,255,255,.05),_transparent_45%)]">
            </div>
        </div>

        <!-- Removed page-specific loading overlay; global loader handles this. -->

        <!-- Registration form -->
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
                            <p class="text-xs text-gray-500 mt-2">Sign up with your school account</p>
                        </div>

                        <div class="space-y-4">
                            <p class="text-xs text-gray-500">
                                Use your KNP school account to create your student portal profile.
                            </p>

                            <button type="button"
                                class="w-full py-2.5 px-4 rounded-xl bg-white text-gray-800 font-semibold tracking-wide border border-gray-300/80 shadow-sm hover:shadow-md hover:bg-gray-50 transition disabled:opacity-60"
                                :disabled="auth.isLoading" @click="signUpWithSchoolAccount">
                                <span class="inline-flex items-center justify-center gap-2">
                                    <i class="mdi mdi-google"></i>
                                    <span>Sign up with School Account</span>
                                    <span class="text-xs text-gray-500">(knp.edu.ph)</span>
                                </span>
                            </button>

                            <div class="text-center text-xs">
                                <router-link to="/login" class="text-primary hover:underline">
                                    Already have an account? Sign in
                                </router-link>
                            </div>
                        </div>
                    </div>

                    <div class="px-6 sm:px-7 pb-6">
                        <div class="flex items-center justify-between text-[11px] text-gray-500">
                            <span>OSAS Kiosk v2.0</span>
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

<script setup>
import { ref, onMounted, nextTick } from "vue";
import ToasterComponent from "../components/ToasterComponent.vue";
import { useAuthStore } from "@/stores/auth";

defineOptions({ name: "RegisterPage" });

const auth = useAuthStore();
const toast = ref(null);

const signUpWithSchoolAccount = () => {
    try {
        auth.startGoogleLogin("#/register");
    } catch (e) {
        toast.value.showToast("warning", e.message || "Unable to start Google sign-up");
    }
};

const tryConsumeSso = () => {
    try {
        const consumed = auth.consumeSsoFromHash();
        if (consumed) toast.value?.showToast("success", "Signed up with school account");
    } catch (e) {
        toast.value?.showToast("warning", e.message || "Google sign-up failed");
    }
};

onMounted(() => {
    tryConsumeSso();
    nextTick(() => tryConsumeSso());
});
</script>
