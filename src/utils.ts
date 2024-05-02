import {
  type ComputedRef,
  type Ref,
  type ShallowRef,
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  toValue,
  watch,
} from 'vue'

/**
 * Adds an event listener to Window that is automatically removed on scope dispose.
 */
export function useEventListener<E extends keyof WindowEventMap>(
  target: Window,
  event: E,
  listener: (this: Window, ev: WindowEventMap[E]) => any,
  options?: boolean | AddEventListenerOptions,
): void

/**
 * Adds an event listener to Document that is automatically removed on scope dispose.
 */
export function useEventListener<E extends keyof DocumentEventMap>(
  target: Document,
  event: E,
  listener: (this: Document, ev: DocumentEventMap[E]) => any,
  options?: boolean | AddEventListenerOptions,
): void

export function useEventListener(
  target: Document | Window | EventTarget,
  event: string,
  listener: (this: EventTarget, ev: Event) => any,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(event, listener, options)
  if (getCurrentScope()) {
    onScopeDispose(() => {
      target.removeEventListener(event, listener)
    })
  }
}

export const IS_CLIENT = typeof window !== 'undefined'

/**
 * Type that represents a value that can be an array or a single value.
 * @internal
 */
export type _MaybeArray<T> = T | T[]

/**
 * Type that represents a value that can be a function or a single value. Used for `defineQuery()` and
 * `defineMutation()`.
 * @internal
 */
export type _MaybeFunction<T, Args extends any[] = []> = T | ((...args: Args) => T)

/**
 * Type that represents a value that can be a promise or a single value.
 * @internal
 */
export type _Awaitable<T> = T | Promise<T>

/**
 * Flattens an object type for readability.
 * @internal
 */
export type _Simplify<T> = { [K in keyof T]: T[K] }

/**
 * Converts a value to an array if necessary.
 *
 * @param value - value to convert
 */
export const toArray = <T>(value: _MaybeArray<T>): T[] =>
  Array.isArray(value) ? value : [value]

export type _JSONPrimitive = string | number | boolean | null | undefined

export interface _ObjectFlat {
  [key: string]: _JSONPrimitive | Array<_JSONPrimitive>
}

/**
 * Stringifies an object no matter the order of keys. This is used to create a hash for a given object. It only works
 * with flat objects. It can contain arrays of primitives only. `undefined` values are skipped.
 *
 * @param obj - object to stringify
 */
export function stringifyFlatObject(obj: _ObjectFlat | _JSONPrimitive): string {
  return obj && typeof obj === 'object'
    ? JSON.stringify(obj, Object.keys(obj).sort())
    : String(obj)
}

/**
 * Merges two types when the second one can be null | undefined. Allows to safely use the returned type for { ...a,
 * ...undefined, ...null }
 * @internal
 */
export type _MergeObjects<Obj, MaybeNull> = MaybeNull extends undefined | null
  ? Obj
  : _Simplify<Obj & MaybeNull>

/**
 * @internal
 */
export const noop = () => {}

/**
 * Creates a delayed computed ref from an existing ref, computed, or getter. Use this to delay a loading state (`isFetching`, `isLoading`) to avoid flickering.
 *
 * @example
 * ```ts
 * const { isLoading: _isLoading } = useQuery({ queryKey: 'todos', queryFn: fetchTodos })
 * const isLoading = delayLoadingRef(_isLoading, 300)
 * ```
 *
 * @param refOrGetter - ref or getter to delay
 * @param delay - delay in ms
 */
export function delayLoadingRef(
  refOrGetter: Ref<boolean> | ComputedRef<boolean> | (() => boolean),
  delay = 300,
) {
  const isDelayElapsed = ref(toValue(refOrGetter))
  const newRef = computed(() => toValue(refOrGetter) && isDelayElapsed.value)
  let timeout: ReturnType<typeof setTimeout> | undefined
  const stop = () => {
    clearTimeout(timeout)
  }
  watch(refOrGetter, (value) => {
    stop()
    if (value) {
      isDelayElapsed.value = false
      timeout = setTimeout(() => {
        isDelayElapsed.value = true
      }, delay)
    }
  })

  onScopeDispose(stop)

  return newRef
}

/**
 * Wraps a getter to be used as a ref. This is useful when you want to use a getter as a ref but you need to modify the
 * value.
 *
 * @internal
 * @param other - getter of the ref to compute
 * @returns a wrapper around a writable getter that can be used as a ref
 */
export const computedRef = <T>(other: () => Ref<T>): ShallowRef<T> =>
  computed({
    get: () => other().value,
    set: (value) => (other().value = value),
  })
