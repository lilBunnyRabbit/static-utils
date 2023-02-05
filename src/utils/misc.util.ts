export const printTodo = (todos: string[]) => {
  const splitTitle = document.title.split("|");
  const title = splitTitle[splitTitle.length - 1].trim();

  console.log(
    `\n%cTODO | ${title}:%c\n` + todos.map((todo) => `• ${todo}`).join("\n") + "\n",
    "font-weight: bold; font-size: 18px",
    "font-size: 14px"
  );
};
