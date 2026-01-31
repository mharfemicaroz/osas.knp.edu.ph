<!-- src/components/profile/SecuritySettingsModal.vue -->
<script setup>
import { ref, computed, watch } from "vue";
import Swal from "sweetalert2";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const auth = useAuthStore();
const userStore = useUserStore();

const savingPassword = ref(false);
const pwdForm = ref({
  old_password: "",
  new_password: "",
  confirm_password: "",
});

const userInfo = computed(() => auth.user || {});

const changePassword = async () => {
  if (!pwdForm.value.old_password || !pwdForm.value.new_password) {
    Swal.fire("Missing fields", "Please fill out both current and new password.", "warning");
    return;
  }
  if (pwdForm.value.new_password !== pwdForm.value.confirm_password) {
    Swal.fire("Mismatch", "New password and confirmation do not match.", "warning");
    return;
  }
  savingPassword.value = true;
  try {
    await userStore.changePassword({
      old_password: pwdForm.value.old_password,
      new_password: pwdForm.value.new_password,
    });
    Swal.fire("Success", "Password changed successfully", "success");
    pwdForm.value = { old_password: "", new_password: "", confirm_password: "" };
  } catch (err) {
    Swal.fire("Failed", userStore.error || "Could not change password", "error");
  } finally {
    savingPassword.value = false;
  }
};

watch(
  () => visible.value,
  (v) => {
    if (!v) {
      pwdForm.value = { old_password: "", new_password: "", confirm_password: "" };
    }
  }
);
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-3"
    @click.self="visible = false"
  >
    <div class="w-full max-w-[900px] max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div class="flex items-center justify-between border-b bg-gradient-to-r from-slate-50 via-white to-white px-5 py-4">
        <div class="min-w-0">
          <div class="text-[11px] uppercase tracking-wider text-gray-500">Security</div>
          <h2 class="text-base font-semibold text-gray-900">Security Settings</h2>
        </div>
        <button class="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200" @click="visible = false">
          Close
        </button>
      </div>

      <div class="space-y-5 overflow-auto px-5 py-5 sm:px-6" style="max-height: 70vh;">
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div class="rounded-xl border bg-white shadow-sm">
            <div class="border-b bg-gray-50 px-4 py-3">
              <div class="text-xs uppercase tracking-wide text-gray-500">Account</div>
            </div>
            <div class="space-y-3 p-4 text-sm text-gray-700">
              <div class="flex items-center justify-between gap-3">
                <span>Email</span>
                <span class="truncate text-gray-500">{{ userInfo.email || "-" }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span>Role</span>
                <span class="text-gray-500">{{ userInfo.role || "user" }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span>2FA</span>
                <span class="text-gray-500">{{ userInfo.twoFAEnabled ? "Enabled" : "Disabled" }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-xl border bg-white shadow-sm">
            <div class="border-b bg-gray-50 px-4 py-3">
              <div class="text-xs uppercase tracking-wide text-gray-500">Password</div>
            </div>
            <div class="p-4">
              <label class="mb-1 block text-xs font-medium text-gray-600">Current password</label>
              <input
                v-model="pwdForm.old_password"
                type="password"
                class="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                placeholder="Current password"
              />

              <label class="mb-1 block text-xs font-medium text-gray-600">New password</label>
              <input
                v-model="pwdForm.new_password"
                type="password"
                class="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                placeholder="New password"
              />

              <label class="mb-1 block text-xs font-medium text-gray-600">Confirm new password</label>
              <input
                v-model="pwdForm.confirm_password"
                type="password"
                class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                placeholder="Confirm password"
              />
            </div>
            <div class="flex justify-end px-4 pb-4">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="savingPassword"
                @click="changePassword"
              >
                <span>{{ savingPassword ? "Updating..." : "Update password" }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Keep your password strong and never share it with anyone.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
