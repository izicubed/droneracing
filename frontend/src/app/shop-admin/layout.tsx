import type { ReactNode } from "react";
import styles from "./shop-admin-theme.module.css";

export default function ShopAdminLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shopAdminTheme}>{children}</div>;
}
