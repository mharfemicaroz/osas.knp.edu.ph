import { defineStore } from "pinia";
import { computed, ref } from "vue";

const KEY = "selectedServiceModule";
const privilegedRoles = new Set(["admin", "manager", "superadmin"]);

export const serviceModules = {
  sdos: {
    key: "sdos",
    title: "Student Development and Organization Services",
    shortTitle: "SDOS",
    description: "Core OSAS administrative system",
  },
  welfare: {
    key: "welfare",
    title: "Student Welfare Services",
    shortTitle: "Student Welfare",
    description: "Student welfare services portal",
  },
  discipline: {
    key: "discipline",
    title: "Student Discipline and Conduct",
    shortTitle: "Discipline and Conduct",
    description: "Discipline casework and conduct management",
  },
};

function isPrivileged(role) {
  return privilegedRoles.has(String(role || "").toLowerCase());
}

function inferModuleFromRoute(route, role) {
  const name = String(route?.name || "");
  const path = String(route?.path || route?.fullPath || "");
  const normalizedRole = String(role || "").toLowerCase();

  if (!isPrivileged(normalizedRole)) return null;
  if (name === "admin-landing") return null;
  if (path.startsWith("/student-discipline-conduct")) return "discipline";
  if (path.startsWith("/student-welfare-services")) return "welfare";
  if (path.startsWith("/dashboard") ||
      path.startsWith("/profile") ||
      path.startsWith("/activity-calendar") ||
      path.startsWith("/annual-plans") ||
      path.startsWith("/clubs-organization") ||
      path.startsWith("/memberships") ||
      path.startsWith("/activity-designs") ||
      path.startsWith("/utilization-requests") ||
      path.startsWith("/liquidation-funds") ||
      path.startsWith("/grievances") ||
      path.startsWith("/session-logs") ||
      path.startsWith("/workflows") ||
      path.startsWith("/user-mgt") ||
      path.startsWith("/tutorials")) {
    return "sdos";
  }
  return null;
}

export const useServiceModuleStore = defineStore("serviceModule", () => {
  const selectedKey = ref(null);

  try {
    const raw = localStorage.getItem(KEY);
    if (raw && serviceModules[raw]) selectedKey.value = raw;
  } catch {}

  const selected = computed(() => (selectedKey.value ? serviceModules[selectedKey.value] || null : null));
  const selectedTitle = computed(() => selected.value?.title || "");
  const selectedShortTitle = computed(() => selected.value?.shortTitle || "");

  function setSelectedModule(key) {
    selectedKey.value = serviceModules[key] ? key : null;
    try {
      if (selectedKey.value) localStorage.setItem(KEY, selectedKey.value);
      else localStorage.removeItem(KEY);
    } catch {}
  }

  function clearSelectedModule() {
    setSelectedModule(null);
  }

  function syncFromRoute(route, role) {
    const inferred = inferModuleFromRoute(route, role);
    if (inferred !== selectedKey.value) setSelectedModule(inferred);
  }

  return {
    selectedKey,
    selected,
    selectedTitle,
    selectedShortTitle,
    setSelectedModule,
    clearSelectedModule,
    syncFromRoute,
  };
});
