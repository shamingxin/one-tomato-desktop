import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { Phase } from "../domain/types";

export function completionCopy(phase: Phase) {
  return phase === "focus"
    ? {
        title: "这一颗番茄完成了",
        body: "做得好，起来走动一下吧。",
      }
    : { title: "休息结束", body: "准备好时，开始下一颗番茄。" };
}

export async function announceCompletion(phase: Phase) {
  if (!("__TAURI_INTERNALS__" in window)) return;

  let granted = await isPermissionGranted();
  if (!granted) granted = (await requestPermission()) === "granted";
  if (granted) sendNotification(completionCopy(phase));
}

export function playCompletionTone() {
  if (!("AudioContext" in window)) return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(660, context.currentTime);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.58);
  oscillator.addEventListener("ended", () => void context.close());
}
