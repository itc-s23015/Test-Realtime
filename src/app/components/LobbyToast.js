"use client";
import React from "react";
import styles from "../styles/LobbyToast.module.css";

export default function LobbyToast({ message }) {
  if (!message) return null;

  return (
    <div className={styles.toastContainer}>
      <div className={styles.toast}>
        {message}
      </div>
    </div>
  );
}