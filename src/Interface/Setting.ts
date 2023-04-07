export default interface Setting{
  value: number | boolean | string,
  name: string,
  values?: string[],
  max?: number,
  min?: number,
  local?: boolean,
  onChange?: (a: any) => void,
  visibleIf?: () => boolean,
  hostOnly?: boolean
}
