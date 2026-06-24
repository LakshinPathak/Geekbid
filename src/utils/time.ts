export const formatDateTime = (value: string): string => {
  const d = new Date(value);
  return d.toLocaleString();
};
