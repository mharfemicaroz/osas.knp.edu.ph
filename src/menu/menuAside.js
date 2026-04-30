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
} from "@mdi/js";

/** Admin base menu (roles metadata) */
const ADMIN_MENU = [
  {
    to: "/dashboard",
    icon: mdiMonitorDashboard,
    label: "Dashboard",
    roles: ["admin", "student", "student_officer"], // student is rerouted to student-dashboard
  },
  {
    to: "/profile",
    icon: mdiAccountCircle,
    label: "Profile",
    roles: ["admin", "student", "student_officer"],
  },
  {
    to: "/activity-calendar",
    icon: mdiCalendar,
    label: "Activity Calendar",
    roles: ["admin", "student", "student_officer"],
  },
  {
    to: "/annual-plans",
    icon: mdiFileDocument,
    label: "Annual Plans",
    roles: ["admin", "student_officer"],
  },
  {
    to: "/clubs-organization",
    icon: mdiAccountGroup,
    label: "Clubs/Organizations",
    roles: ["admin", "student_officer"], // allow student officers
  },
  {
    to: "/memberships",
    icon: mdiAccountGroup,
    label: "Memberships",
    roles: ["admin"],
  },
  {
    to: "/activity-designs",
    icon: mdiPencil,
    label: "Activity Designs",
    roles: ["admin", "student_officer"],
  },
  {
    to: "/utilization-requests",
    icon: mdiFileDocument,
    label: "Utilization Requests",
    roles: ["admin", "student_officer"],
  },
  {
    to: "/liquidation-funds",
    icon: mdiCashCheck,
    label: "Liquidation Forms",
    roles: ["admin", "student_officer"],
  },
  {
    to: "/grievances",
    icon: mdiCommentAlert,
    label: "Grievances",
    roles: ["admin", "manager", "student_officer"],
  },
  {
    to: "/student-discipline-conduct",
    icon: mdiScaleBalance,
    label: "Discipline Dashboard",
    roles: ["admin", "manager"],
  },
  {
    to: "/student-discipline-conduct/cases",
    icon: mdiClipboardTextSearchOutline,
    label: "Discipline Cases",
    roles: ["admin", "manager"],
  },
  {
    to: "/student-discipline-conduct/sanctions",
    icon: mdiGavel,
    label: "Discipline Sanctions",
    roles: ["admin", "manager"],
  },
  {
    to: "/student-discipline-conduct/appeals",
    icon: mdiFileDocumentCheckOutline,
    label: "Discipline Appeals",
    roles: ["admin", "manager"],
  },
  {
    to: "/session-logs",
    icon: mdiFileCog,
    label: "Session Logs",
    roles: ["admin", "manager"],
  },
  {
    to: "/workflows",
    icon: mdiFileDocument,
    label: "Workflows",
    roles: ["admin"],
  },
  {
    to: "/user-mgt",
    icon: mdiAccount,
    label: "User Management",
    roles: ["admin"],
  },
  {
    to: "/tutorials",
    icon: mdiBookOpenVariant,
    label: "Tutorials",
    roles: ["admin", "student", "student_officer"],
  },
  // {
  //   to: "/lobby-complains",
  //   icon: mdiCommentAlert,
  //   label: "Lobby Complains",
  //   roles: ["admin", "student", "student_officer"],
  // },
];

export const buildMenu = (role = "admin") => {
  role = (role || "admin").toLowerCase();
  const filtered = ADMIN_MENU.filter(
    (m) => !m.roles || m.roles.map((r) => r.toLowerCase()).includes(role)
  ).map((m) => {
    if (role.startsWith("student") && m.to === "/dashboard") {
      return { ...m, to: "/student-dashboard" };
    }
    return m;
  });
  return filtered;
};

export default ADMIN_MENU;
