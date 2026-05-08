import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { fetchNearbyEarthquake, handleQuakeFound } from "./useEarthquakeCheck";

const EARTHQUAKE_TASK = "lifeline-earthquake-check";

export async function checkEarthquakes() {
  const quake = await fetchNearbyEarthquake();
  if (!quake) return false;

  await handleQuakeFound(quake);
  return true;
}

if (!TaskManager.isTaskDefined(EARTHQUAKE_TASK)) {
  TaskManager.defineTask(EARTHQUAKE_TASK, async () => {
    try {
      const found = await checkEarthquakes();
      return found
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
      console.log("Earthquake background check failed:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function registerWeatherBackgroundFetch() {
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    console.log("Background fetch is unavailable");
    return;
  }

  const registeredTasks = await TaskManager.getRegisteredTasksAsync();
  const isRegistered = registeredTasks.some((task) => task.taskName === EARTHQUAKE_TASK);

  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(EARTHQUAKE_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}
