export const toIsoString = ({
  value,
}: {
  value: Date | null;
}): string | null => (value ? value.toISOString() : null);
