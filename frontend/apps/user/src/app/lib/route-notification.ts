export type RouteNotificationVariant = "success" | "error" | "warning" | "info";

export interface RouteNotification {
  message: string;
  variant?: RouteNotificationVariant;
}

export interface RouteNotificationState {
  notification?: RouteNotification;
  [key: string]: unknown;
}
