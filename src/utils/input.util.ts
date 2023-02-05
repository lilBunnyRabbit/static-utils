export function debounce<T extends any[]>(callback: (...args: T) => any, timeout = 250) {
  let timer: NodeJS.Timeout;

  return (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback.apply(this, args), timeout);
  };
}
