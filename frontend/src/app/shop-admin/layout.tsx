import type { ReactNode } from "react";
import metricStyles from "./shop-admin-metrics.module.css";
import styles from "./shop-admin-theme.module.css";

export default function ShopAdminLayout({ children }: { children: ReactNode }) {
  return <div className={`${styles.shopAdminTheme} ${metricStyles.metricColors}`}>{children}</div>;
}
