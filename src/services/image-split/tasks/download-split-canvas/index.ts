import { ImageFile } from "@/helpers/image-file";
import { Task } from "@/packages/task-manager";

import * as Tasks from "./task";
export * as DownloadSplitCanvasTask from "./task";

export interface DownloadSplitCanvasConfig {
  filename: string;
  columns: number;
  rows: number;
  size: number;
}

export default function DownloadSplitCanvasTasks(config: DownloadSplitCanvasConfig, imageFile: ImageFile): Task[] {
  return [
    Tasks.GenerateInfo({ config, imageFile }),
    Tasks.CreateZip(),
    Tasks.CreateCanvas(),
    Tasks.CreateAndZip({ config, imageFile }),
    Tasks.PackageZip(),
  ];
}
