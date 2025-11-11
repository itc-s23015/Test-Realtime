import React from "react";
import styles from "../styles/SideBar.module.css";

const SideBar = ({ side, open, onToggle, title, children }) => {
  const isLeft = side === "left";

  return (
    <aside
      className={`${styles.sidebar} ${isLeft ? styles.sidebarLeft : styles.sidebarRight} ${
        open
          ? styles.sidebarOpen
          : isLeft
          ? styles.sidebarClosedLeft
          : styles.sidebarClosedRight
      }`}
    >
      <button
        onClick={onToggle}
        aria-label="toggle sidebar"
        className={`${styles.sidebarToggle} ${
          isLeft ? styles.sidebarToggleLeft : styles.sidebarToggleRight
        }`}
      >
        {isLeft ? (open ? "◀" : "▶") : open ? "▶" : "◀"}
      </button>
      <div className={styles.sidebarTitle}>{title}</div>
      <div className={styles.sidebarContent}>{children}</div>
    </aside>
  );
}
export default SideBar;