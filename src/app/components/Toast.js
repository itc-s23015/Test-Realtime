"use client";
import React from "react";
import styles from "../styles/Toast.module.css";

export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div className={styles.toastContainer}>
      <div className={styles.toast}>
        {message}
      </div>
    </div>
  );
}
