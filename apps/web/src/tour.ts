import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { messages, type Lang } from "./copy";

const SEEN = "readout-tour-seen";

export function startTour(lang: Lang) {
  const t = messages(lang);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tour = driver({
    animate: !reduce,
    showProgress: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 0,
    popoverClass: "readout-tour",
    nextBtnText: t.next,
    prevBtnText: t.back,
    doneBtnText: t.done,
    disableActiveInteraction: true,
    steps: [
      {
        element: "#address-search",
        popover: {
          title: t.tourSearchTitle,
          description: t.tourSearch,
          side: "bottom",
        },
      },
      {
        element: "#map-layers",
        popover: {
          title: t.tourLayersTitle,
          description: t.tourLayers,
          side: "bottom",
          align: "end",
        },
      },
      {
        popover: {
          title: t.tourClickTitle,
          description: t.tourClick,
        },
      },
      {
        element: "#saved-places",
        popover: {
          title: t.tourSavedTitle,
          description: t.tourSaved,
          side: "bottom",
          align: "end",
        },
      },
    ],
  });
  tour.drive();
}

export function startTourIfNew(lang: Lang) {
  try {
    if (localStorage.getItem(SEEN)) return;
    localStorage.setItem(SEEN, "1");
  } catch {
    return;
  }
  startTour(lang);
}
