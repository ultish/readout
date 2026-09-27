import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const SEEN = "readout-tour-seen";

export function startTour() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tour = driver({
    animate: !reduce,
    showProgress: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 0,
    popoverClass: "readout-tour",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    disableActiveInteraction: true,
    steps: [
      {
        element: "#address-search",
        popover: {
          title: "Find a town",
          description:
            "Type a city such as Sapporo or 札幌, a Japanese address, or coordinates. One match moves the map there. Click the map to pick the exact spot.",
          side: "bottom",
        },
      },
      {
        element: "#map-layers",
        popover: {
          title: "The colours are published zones",
          description:
            "Flood is the assumed-maximum depth. Quake is the 30-year chance of shaking intensity 6-lower or higher. Tsunami and landslide stay off until you turn them on.",
          side: "bottom",
          align: "end",
        },
      },
      {
        popover: {
          title: "Click a spot",
          description:
            "The panel lists flood depth, the quake percentage, tsunami, landslide, and the ground type for that point. Red text means the point sits inside a published zone.",
        },
      },
      {
        element: "#saved-places",
        popover: {
          title: "Keep a shortlist",
          description:
            "Save place stores that readout on this machine. Saved opens the list so you can jump back.",
          side: "bottom",
          align: "end",
        },
      },
    ],
  });
  tour.drive();
}

export function startTourIfNew() {
  try {
    if (localStorage.getItem(SEEN)) return;
    localStorage.setItem(SEEN, "1");
  } catch {
    return;
  }
  startTour();
}
