import createUserTask from "./createUser.task";
import updateUserTask from "./updateUser.task";
import validateUserTask from "./validateUser.task";

export default (id: number, author: string) => [
  createUserTask({ id }),
  updateUserTask({ author }),
  validateUserTask(),
];
