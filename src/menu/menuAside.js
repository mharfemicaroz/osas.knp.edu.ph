// src/menuaside.js
import {
  mdiMonitorDashboard,
  mdiCalendar,
  mdiPencil,
  mdiCashCheck,
  mdiCommentAlert,
  mdiAccountGroup,
  mdiAccountCircle,
  mdiFileDocument,
  mdiAccount,
  mdiBookOpenVariant,
  mdiFileCog,
  mdiScaleBalance,
  mdiClipboardTextSearchOutline,
  mdiGavel,
  mdiFileDocumentCheckOutline,
  mdiCompassOutline,
  mdiHeartPulse,
} from "@mdi/js";

const SHARED_ITEMS = [
  {
    to: "/profile",
    icon: mdiAccountCircle,
    label: "Profile",
    roles: ["admin", "manager", "student", "student_officer"],
    section: "General",
  },
];

const SDOS_MENU = [
  {
    to: "/admin-landing",
    icon: mdiCompassOutline,
    label: "Change Module",
    roles: ["admin", "manager"],
    section: "General",
  },
  {
    to: "/dashboard",
    icon: mdiMonitorDashboard,
    label: "Dashboard",
    roles: ["admin", "manager", "student", "student_officer"],
    section: "General",
  },
  {
    to: "/activity-calendar",
    icon: mdiCalendar,
    label: "Activity Calendar",
    roles: ["admin", "student", "student_officer"],
    section: "General",
  },
  {
    to: "/annual-plans",
    icon: mdiFileDocument,
    label: "Annual Plans",
    roles: ["admin", "student_officer"],
    section: "Operations",
  },
  {
    to: "/clubs-organization",
    icon: mdiAccountGroup,
    label: "Clubs and Organizations",
    roles: ["admin", "student_officer"],
    section: "Operations",
  },
  {
    to: "/memberships",
    icon: mdiAccountGroup,
    label: "Memberships",
    roles: ["admin"],
    section: "Operations",
  },
  {
    to: "/activity-designs",
    icon: mdiPencil,
    label: "Activity Designs",
    roles: ["admin", "student_officer"],
    section: "Operations",
  },
  {
    to: "/utilization-requests",
    icon: mdiFileDocument,
    label: "Utilization Requests",
    roles: ["admin", "student_officer"],
    section: "Operations",
  },
  {
    to: "/liquidation-funds",
    icon: mdiCashCheck,
    label: "Liquidation Forms",
    roles: ["admin", "student_officer"],
    section: "Operations",
  },
  {
    to: "/grievances",
    icon: mdiCommentAlert,
    label: "Grievances",
    roles: ["admin", "manager", "student_officer"],
    section: "Operations",
  },
  {
    to: "/session-logs",
    icon: mdiFileCog,
    label: "Session Logs",
    roles: ["admin", "manager"],
    section: "Administration",
  },
  {
    to: "/workflows",
    icon: mdiFileDocument,
    label: "Workflows",
    roles: ["admin"],
    section: "Administration",
  },
  {
    to: "/user-mgt",
    icon: mdiAccount,
    label: "User Management",
    roles: ["admin"],
    section: "Administration",
  },
  {
    to: "/tutorials",
    icon: mdiBookOpenVariant,
    label: "Tutorials",
    roles: ["admin", "student", "student_officer"],
    section: "General",
  },
];

const DISCIPLINE_MENU = [
  {
    to: "/admin-landing",
    icon: mdiCompassOutline,
    label: "Change Module",
    roles: ["admin", "manager"],
    section: "General",
  },
  {
    to: "/student-discipline-conduct",
    icon: mdiScaleBalance,
    label: "Discipline Dashboard",
    roles: ["admin", "manager"],
    section: "Discipline",
  },
  {
    to: "/student-discipline-conduct/cases",
    icon: mdiClipboardTextSearchOutline,
    label: "Case Workflow",
    roles: ["admin", "manager"],
    section: "Discipline",
  },
  {
    to: "/student-discipline-conduct/sanctions",
    icon: mdiGavel,
    label: "Sanctions and Offenses",
    roles: ["admin", "manager"],
    section: "Discipline",
  },
  {
    to: "/student-discipline-conduct/appeals",
    icon: mdiFileDocumentCheckOutline,
    label: "Appeals and Records",
    roles: ["admin", "manager"],
    section: "Discipline",
  },
];

const WELFARE_MENU = [
  {
    to: "/admin-landing",
    icon: mdiCompassOutline,
    label: "Change Module",
    roles: ["admin", "manager"],
    section: "General",
  },
  {
    to: "/student-welfare-services",
    icon: mdiHeartPulse,
    label: "Welfare Portal",
    roles: ["admin", "manager"],
    section: "Welfare",
  },
];

export const buildMenu = (role = "admin", moduleKey = null) => {
  role = (role || "admin").toLowerCase();
  const source =
    moduleKey === "discipline"
      ? [...SHARED_ITEMS, ...DISCIPLINE_MENU]
      : moduleKey === "welfare"
        ? [...SHARED_ITEMS, ...WELFARE_MENU]
        : [...SHARED_ITEMS, ...SDOS_MENU];

  const filtered = source.filter(
    (m) => !m.roles || m.roles.map((r) => r.toLowerCase()).includes(role)
  ).map((m) => {
    if (role.startsWith("student") && m.to === "/dashboard") {
      return { ...m, to: "/student-dashboard" };
    }
    return m;
  });
  return filtered;
};

export default [...SHARED_ITEMS, ...SDOS_MENU];
