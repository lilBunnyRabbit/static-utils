import "../styles/notification.scss";
import { t } from "./template.util";

interface Notification {
  title: string;
  description: string;
  type?: "normal" | "error" | "success";
}

const tNotification = t`
<div class="notification">
  <div class="notification-title">Title</div>
  <div class="notification-description">Description</div>
</div>
`;

export function createNotification({ title, description, type = "normal" }: Notification) {
  let $notifications = document.getElementById("notifications");
  if (!$notifications) {
    $notifications = document.createElement("div");
    $notifications.id = "notifications";
    document.body.append($notifications);
  }

  const notification = tNotification.clone();
  const $notification = notification.querySelector(".notification") as HTMLDivElement;
  $notification.classList.add(type);

  $notification.querySelector(".notification-title").innerHTML = title;
  $notification.querySelector(".notification-description").innerHTML = description;

  $notifications.prepend(notification);

  setTimeout(() => {
    $notification.style.opacity = "0";
    setTimeout(() => {
      $notification.remove();
    }, 1000);
  }, 1000);
}
