import React from "react";
import "../styles/sidebar.css";

const SideBar = ({ side, open, onToggle, title, children }) => {
  const isLeft = side === "left";

  return (
    <>
      {/* 画面端に固定されたトグルボタン */}
      <button
        onClick={onToggle}
        className={`sidebarToggle ${isLeft ? "toggleLeft" : "toggleRight"}`}
      >
        {isLeft ? (open ? "◀" : "▶") : open ? "▶" : "◀"}
      </button>

      {/* サイドバー本体 */}
      <aside
        className={`sidebar ${isLeft ? "sidebarLeft" : "sidebarRight"} ${
          open
            ? "sidebarOpen"
            : isLeft
            ? "sidebarClosedLeft"
            : "sidebarClosedRight"
        }`}
      >
        <div className="sidebarTitle">{title}</div>
        <div className="sidebarContent">{children}</div>
      </aside>
    </>
  );
};

export default SideBar;
