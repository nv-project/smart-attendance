// "mca 1 a" -> "MCA-1-A" so small typing differences don't break matching
export const normalizeBatch = (b = '') =>
  String(b).trim().toUpperCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-');