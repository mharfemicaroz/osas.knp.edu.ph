import {
  mdiMonitorDashboard,
  mdiCalendar,
  mdiPencil,
  mdiFileDocument,
  mdiCashCheck,
  mdiCommentAlert,
  mdiAccountGroup,
  mdiAccountCircle,
  mdiOfficeBuilding,
} from "@mdi/js";

export default [
  {
    to: "/dashboard",
    icon: mdiMonitorDashboard,
    label: "Dashboard",
  },
  {
    to: "/profile",
    icon: mdiAccountCircle,
    label: "Profile",
  },
  {
    to: "/clubs-organization",
    icon: mdiAccountGroup,
    label: "Clubs/Organization",
  },
  {
    to: "/activity-calendar",
    icon: mdiCalendar,
    label: "Activity Calendar",
  },
  {
    to: "/activity-design",
    icon: mdiPencil,
    label: "Activity Design",
  },
  {
    to: "/utilization-request",
    icon: mdiFileDocument,
    label: "Utilization Request",
  },
  {
    to: "/liquidation-form",
    icon: mdiCashCheck,
    label: "Liquidation Form",
  },
  {
    to: "/lobby-complains",
    icon: mdiCommentAlert,
    label: "Lobby Complains",
  },
];
