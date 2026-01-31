<!-- src/components/profile/AccountSettingsModal.vue -->
<script setup>
import { ref, computed, watch } from "vue";
import Swal from "sweetalert2";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";
import userService from "@/services/user/userService";

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

const loading = ref(false);
const saving = ref(false);
const metaSnapshot = ref({});

const form = ref({
  username: "",
  first_name: "",
  last_name: "",
  bio: "",
  metadata: {
    birthday: "",
    sex: "",
    place_lived: "",
  },
});

const normalizeMetadata = (meta) => {
  if (!meta) return {};
  if (typeof meta === "string") {
    try {
      const parsed = JSON.parse(meta);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof meta === "object" && !Array.isArray(meta)) return meta;
  return {};
};

const seedFrom = (u) => {
  const src = u || {};
  const meta = normalizeMetadata(src.metadata);
  metaSnapshot.value = { ...meta };
  form.value = {
    username: src.username || "",
    first_name: src.first_name || "",
    last_name: src.last_name || "",
    bio: src.bio || "",
    metadata: {
      birthday: meta.birthday || "",
      sex: meta.sex || "",
      place_lived: meta.place_lived || meta.placeLived || "",
    },
  };
};

const loadSelf = async () => {
  const id = auth.user?.id;
  if (!id) return;
  if (userStore.selectedUser?.id === id) {
    seedFrom(userStore.selectedUser);
    return;
  }
  loading.value = true;
  try {
    const fresh = await userService.getById(id);
    seedFrom(fresh || auth.user);
  } catch {
    seedFrom(auth.user);
  } finally {
    loading.value = false;
  }
};

watch(
  () => visible.value,
  (v) => {
    if (v) loadSelf();
  }
);

const saveProfile = async () => {
  const id = auth.user?.id;
  if (!id) return;
  saving.value = true;
  try {
    const cleanField = (value) => {
      const v = String(value || "").trim();
      return v ? v : null;
    };
    const metadata = {
      ...metaSnapshot.value,
      birthday: cleanField(form.value.metadata.birthday),
      sex: cleanField(form.value.metadata.sex),
      place_lived: cleanField(form.value.metadata.place_lived),
    };
    const payload = {
      username: form.value.username || null,
      first_name: form.value.first_name || null,
      last_name: form.value.last_name || null,
      bio: form.value.bio || null,
      metadata,
    };
    const updated = await userStore.updateById(id, payload);
    const next = { ...auth.user, ...updated };
    auth.user = next;
    try {
      localStorage.setItem("userData", JSON.stringify(next));
    } catch {}
    seedFrom(updated || payload);
    Swal.fire("Saved", "Profile updated successfully", "success");
  } catch (err) {
    Swal.fire("Update failed", userStore.error || "Could not update profile", "error");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-3"
    @click.self="visible = false"
  >
    <div class="w-full max-w-[860px] max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div class="flex items-center justify-between border-b bg-gradient-to-r from-slate-50 via-white to-white px-5 py-4">
        <div class="min-w-0">
          <div class="text-[11px] uppercase tracking-wider text-gray-500">Account</div>
          <h2 class="text-base font-semibold text-gray-900">Account Settings</h2>
        </div>
        <button class="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200" @click="visible = false">
          Close
        </button>
      </div>

      <div class="space-y-5 overflow-auto px-5 py-5 sm:px-6" style="max-height: 70vh;">
        <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div class="rounded-xl border bg-white shadow-sm">
            <div class="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
              <div class="text-xs uppercase tracking-wide text-gray-500">Profile Details</div>
              <div v-if="loading" class="text-xs text-gray-400">Loading...</div>
            </div>
            <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Username</label>
                <input
                  v-model="form.username"
                  class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  placeholder="yourhandle"
                  :disabled="loading || saving"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">First name</label>
                <input
                  v-model="form.first_name"
                  class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  placeholder="First name"
                  :disabled="loading || saving"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Last name</label>
                <input
                  v-model="form.last_name"
                  class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  placeholder="Last name"
                  :disabled="loading || saving"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="mb-1 block text-xs font-medium text-gray-600">Bio</label>
                <textarea
                  v-model="form.bio"
                  rows="4"
                  class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  placeholder="Share a short note about yourself"
                  :disabled="loading || saving"
                ></textarea>
              </div>
            </div>
          </div>

          <div class="rounded-xl border bg-white shadow-sm">
            <div class="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
              <div class="text-xs uppercase tracking-wide text-gray-500">Personal Profile</div>
            </div>
            <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Birthday</label>
                <input
                  v-model="form.metadata.birthday"
                  type="date"
                  class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  :disabled="loading || saving"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Sex</label>
                <select
                  v-model="form.metadata.sex"
                  class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  :disabled="loading || saving"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label class="mb-1 block text-xs font-medium text-gray-600">Place lived</label>
                <input
                  v-model="form.metadata.place_lived"
                  class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  placeholder="City or hometown"
                  :disabled="loading || saving"
                />
              </div>
            </div>
            <div class="border-t bg-slate-50 px-4 py-3 text-[11px] text-gray-500">
              These details are kept in your private profile metadata.
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs text-gray-500">Your public name and bio appear on your profile.</p>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="saving || loading"
            @click="saveProfile"
          >
            <span>{{ saving ? "Saving..." : "Save changes" }}</span>
          </button>
        </div>
      </div>

      <div class="border-t bg-gray-50 px-5 py-3 text-[11px] text-gray-500">
        Tip: Keep your profile aligned with official school records.
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
