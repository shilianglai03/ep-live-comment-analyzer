import { createRouter, createWebHashHistory } from "vue-router";

import AnalysisPage from "../pages/AnalysisPage.vue";
import ArchivePage from "../pages/ArchivePage.vue";
import DeskPage from "../pages/DeskPage.vue";
import ImportPage from "../pages/ImportPage.vue";
import OverviewPage from "../pages/OverviewPage.vue";
import ReportPage from "../pages/ReportPage.vue";
import ScriptPage from "../pages/ScriptPage.vue";
import SettingsPage from "../pages/SettingsPage.vue";

const routes = [
  { path: "/", redirect: "/overview" },
  { path: "/overview", component: OverviewPage, meta: { title: "实时总览" } },
  { path: "/import", component: ImportPage, meta: { title: "批量导入" } },
  { path: "/desk", component: DeskPage, meta: { title: "回复工作台" } },
  { path: "/analysis", component: AnalysisPage, meta: { title: "分析看板" } },
  { path: "/script", component: ScriptPage, meta: { title: "话术建议" } },
  { path: "/report", component: ReportPage, meta: { title: "复盘报告" } },
  { path: "/archive", component: ArchivePage, meta: { title: "归档记录" } },
  { path: "/settings", component: SettingsPage, meta: { title: "运行设置" } },
  { path: "/:pathMatch(.*)*", redirect: "/overview" },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
