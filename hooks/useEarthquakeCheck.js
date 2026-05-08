import { ref, set } from "firebase/database";
import { db } from "../firebase";
import { scheduleNotification } from "../utils/notifications";

const DANAO_LAT = 10.5207;
const DANAO_LON = 124.0272;
const SEARCH_RADIUS_KM = 200;
const MIN_MAGNITUDE = 4;
const USGS_FEED =
  "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&orderby=time&limit=20&minmagnitude=4";

function distanceKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export async function fetchNearbyEarthquake() {
  const response = await fetch(USGS_FEED);
  if (!response.ok) {
    throw new Error(`USGS request failed: ${response.status}`);
  }

  const data = await response.json();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  return (data.features || []).find((feature) => {
    const [longitude, latitude] = feature.geometry?.coordinates || [];
    const { mag, time } = feature.properties || {};

    if (!latitude || !longitude || !time || mag < MIN_MAGNITUDE) return false;

    return (
      time >= oneDayAgo &&
      distanceKm(DANAO_LAT, DANAO_LON, latitude, longitude) <= SEARCH_RADIUS_KM
    );
  });
}

export async function handleQuakeFound(quake) {
  const props = quake.properties || {};
  const magnitude = props.mag ?? "Unknown";
  const place = props.place || "near Danao City";
  const message = `Magnitude ${magnitude} earthquake detected at ${place}. Take cover and stay alert.`;

  await set(ref(db, "emergencyAlert"), {
    active: true,
    message,
    timestamp: Date.now(),
    type: "earthquake",
  });

  await scheduleNotification({
    content: {
      title: "Earthquake Alert - LIFELINE",
      body: message,
      sound: true,
      data: { type: "earthquake", screen: "evacuation" },
    },
    trigger: null,
  });
}
