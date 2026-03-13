"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import ReactGA from "react-ga4";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-7SVYYZCBL1";

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    ReactGA.initialize(GA_MEASUREMENT_ID);
  }, []);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    ReactGA.send({ hitType: "pageview", page: url });
  }, [pathname, searchParams]);

  return null;
}
