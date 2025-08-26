// src/menuaside.js
import {
  mdiMonitorDashboard,
  mdiCalendar,
  mdiPencil,
  mdiFileDocument,
  mdiCashCheck,
  mdiCommentAlert,
  mdiAccountGroup,
  mdiAccountCircle,
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
    to: "/clubs-organization",
    icon: mdiAccountGroup,
    label: "Clubs/Organization",
    roles: ["admin", "student_officer"], // allow student officers
  },
  {
    to: "/activity-calendar",
    icon: mdiCalendar,
    label: "Activity Calendar",
    roles: ["admin", "student", "student_officer"],
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
    label: "Utilization Request",
    roles: ["admin", "student_officer"],
  },
  {
    to: "/liquidation-funds",
    icon: mdiCashCheck,
    label: "Liquidation Form",
    roles: ["admin", "student_officer"],
  },
  {
    to: "/lobby-complains",
    icon: mdiCommentAlert,
    label: "Lobby Complains",
    roles: ["admin", "student", "student_officer"],
  },
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
