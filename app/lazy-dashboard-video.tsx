"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./product-showcase.module.css";

export default function LazyDashboardVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReduceMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    const video = videoRef.current;
    if (!video || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return () => mediaQuery.removeEventListener("change", updateMotionPreference);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (!shouldLoad || !videoRef.current) return;
    const video = videoRef.current;
    const source = "/hero-dashboard.mp4";

    if (video.src !== `${window.location.origin}${source}`) {
      video.src = source;
      video.load();
    }

    if (!reduceMotion) {
      void video.play().catch(() => {
        // Autoplay can be blocked by the browser; the video remains available as a manual control.
      });
    }
  }, [shouldLoad, reduceMotion]);

  return (
    <video
      ref={videoRef}
      className={styles.video}
      muted
      loop
      playsInline
      preload="none"
      controls={reduceMotion}
      aria-label="Animated Hali CMS dashboard product showcase"
    />
  );
}
