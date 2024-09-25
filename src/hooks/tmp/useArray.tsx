import { isFunction } from "@lilbunnyrabbit/utils";
import React from "react";

export class ArrayActions<T> {
  constructor(readonly set: React.Dispatch<React.SetStateAction<T[]>>) {}

  /**
   * Clear array.
   *
   * ```ts
   * []
   * ```
   */
  public clear() {
    return this.set([]);
  }

  /**
   * Clone array.
   *
   * ```ts
   * (array) => [...array]
   * ```
   */
  public clone() {
    return this.set((array) => [...array]);
  }

  /**
   * Append to array.
   *
   * ```ts
   * (array) => [...array, value]
   * ```
   */
  public add(value: T) {
    return this.set((array) => [...array, value]);
  }

  /**
   * Prepend to array.
   *
   * ```ts
   * (array) => [value, ...array]
   * ```
   */
  public prepend(value: T) {
    return this.set((array) => [value, ...array]);
  }

  /**
   * Filter array.
   *
   * ```ts
   * (array) => array.filter(...args)
   * ```
   */
  public filter(...args: Parameters<T[]["filter"]>) {
    return this.set((array) => array.filter(...args));
  }

  /**
   * Remove by index.
   *
   * ```ts
   * this.filter((_, i) => i !== index)
   * ```
   */
  public remove(index: number) {
    return this.filter((_, i) => i !== index);
  }

  /**
   * Map array.
   *
   * ```ts
   * (array) => array.map(...args)
   * ```
   */
  public map(callbackfn: (value: T, index: number, array: T[]) => T, thisArg?: any) {
    return this.set((array) => array.map<T>(callbackfn, thisArg));
  }

  /**
   * Replace item at index.
   *
   * ```ts
   * this.map((v, i) => {
      if (i === index) {
        return isFunction(value) ? value(v) : value;
      }

      return v;
    })
   * ```
   */
  public replace(index: number, value: T | ((value: T) => T)) {
    return this.map((v, i) => {
      if (i === index) {
        return isFunction(value) ? value(v) : value;
      }

      return v;
    });
  }

  /**
   * Map wrapper.
   *
   * ```ts
   * this.map((v, i, a) => {
      const result = callbackfn(v, i, a);
      return result ?? v;
    }, thisArg)
   * ```
   */
  public update(callbackfn: (value: T, index: number, array: T[]) => T | void, thisArg?: any) {
    return this.map((v, i, a) => {
      const result = callbackfn(v, i, a);
      return result ?? v;
    }, thisArg);
  }

  /**
   * Insert in array.
   *
   * ```ts
   * (array) => [...array.slice(0, index), value, ...array.slice(index)]
   * ```
   */
  public insert(index: number, value: T) {
    return this.set((array) => [...array.slice(0, index), value, ...array.slice(index)]);
  }

  /**
   * Creates a clone to modify.
   *
   * ```ts
   * (array) => {
      const copy = [...array];
      const result = callbackfn(copy);
      return result ?? copy;
    }
   * ```
   */
  public modify(callbackfn: (array: T[]) => T[] | void) {
    return this.set((array) => {
      const copy = [...array];
      const result = callbackfn(copy);
      return result ?? copy;
    });
  }
}

// TODO
export function useArray<T>(initialArray?: T[] | (() => T[]), onChange?: (array: T[]) => void) {
  const [array, setArray] = React.useState<T[]>(initialArray ?? []);

  const actions = React.useMemo(() => new ArrayActions(setArray), [setArray]);

  React.useEffect(() => {
    if (onChange) {
      onChange(array);
    }
  }, [array]);

  return [array, actions] as const;
}
