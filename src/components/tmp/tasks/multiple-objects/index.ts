import avarageObjectsTask from "./avarageObjects.task";
import createObjectTask from "./createObject.task";
import firstLastTask from "./firstLast.task";
import sumObjectsTask from "./sumObjects.task";

export default (values: number[]) => [
  ...values.map((value) => {
    return createObjectTask(value);
  }),
  sumObjectsTask(),
  avarageObjectsTask(),
  firstLastTask(),
];
